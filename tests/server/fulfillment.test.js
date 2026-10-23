import test from 'node:test';
import assert from 'node:assert/strict';
import { fulfillSession } from '../../server/fulfillment.js';
import { MAX_ATTEMPTS, memoryOrderStore } from '../../server/orders.js';

const paidSession = (overrides = {}) => ({
  id: 'cs_test_1', status: 'complete', paid: true, email: 'pat@example.com', amountTotalCents: 4598, cart: 'p1:1001:2;p2:7:1',
  recipient: { name: 'Pat Hunter', email: 'pat@example.com', phone: '555', address: { line1: '1 Main', line2: '', city: 'Hazard', state: 'KY', postalCode: '41701', country: 'US' } },
  ...overrides
});

function harness({ session = paidSession(), createFails = [], submitFails = [] } = {}) {
  const calls = { create: [], submit: [], alerts: [] };
  const services = {
    payments: { retrieveSession: async () => session },
    fulfiller: {
      createOrder: async order => { calls.create.push(order); const failure = createFails.shift(); if (failure) throw failure; return { id: `po-${calls.create.length}` }; },
      submitOrder: async id => { calls.submit.push(id); const failure = submitFails.shift(); if (failure) throw failure; }
    }
  };
  const env = { RESEND_API_KEY: 'k', ALERT_EMAIL: 'austin@example.com' };
  const fetcher = async (_url, init) => { calls.alerts.push(JSON.parse(init.body)); return Response.json({ id: 'email' }); };
  const store = memoryOrderStore();
  const run = () => fulfillSession({ sessionId: 'cs_test_1', env, services, store, fetcher });
  return { calls, store, run };
}

const permanent = message => Object.assign(new Error(message), { permanent: true });

test('a paid session creates the supplier order once and sends it to production', async () => {
  const { calls, store, run } = harness();
  assert.equal(await run(), 'submitted');
  assert.deepEqual(calls.create[0].lines, [{ productId: 'p1', variantId: 1001, quantity: 2 }, { productId: 'p2', variantId: 7, quantity: 1 }]);
  assert.equal(calls.create[0].id, 'cs_test_1');
  assert.deepEqual(calls.submit, ['po-1']);
  assert.equal((await store.get('cs_test_1')).status, 'submitted');
  assert.equal(calls.alerts.length, 0);
});

test('a duplicate webhook delivery does nothing', async () => {
  const { calls, run } = harness();
  await run();
  assert.equal(await run(), 'already');
  assert.equal(await run(), 'already');
  assert.equal(calls.create.length, 1);
  assert.equal(calls.submit.length, 1);
});

test('two deliveries at once: only one does the work', async () => {
  const { calls, run } = harness();
  const results = await Promise.all([run(), run()]);
  assert.deepEqual(results.sort(), ['busy', 'submitted']);
  assert.equal(calls.create.length, 1);
});

test('an unpaid session (delayed payment method) is left alone and can be retried later', async () => {
  const unpaid = harness({ session: paidSession({ paid: false }) });
  assert.equal(await unpaid.run(), 'unpaid');
  assert.equal(unpaid.calls.create.length, 0);
  const record = await unpaid.store.get('cs_test_1');
  assert.deepEqual([record.status, record.attempts], ['received', 0]);
});

test('a temporary failure is retried, and the retry does not create a second supplier order', async () => {
  const { calls, store, run } = harness({ submitFails: [new Error('Printify returned HTTP 503')] });
  await assert.rejects(run(), /503/);
  assert.deepEqual([(await store.get('cs_test_1')).status, (await store.get('cs_test_1')).supplier_order_id], ['failed', 'po-1']);
  assert.equal(calls.alerts.length, 1, 'first failure alerts');
  assert.match(calls.alerts[0].text, /retry automatically/);
  assert.equal(await run(), 'submitted');
  assert.equal(calls.create.length, 1, 'order was not created twice');
  assert.deepEqual(calls.submit, ['po-1', 'po-1']);
});

test('a permanent failure stops retrying and alerts with everything needed to fix it by hand', async () => {
  const { calls, store, run } = harness({ createFails: [permanent('Printify returned HTTP 422: invalid address')] });
  assert.equal(await run(), 'needs_attention');
  assert.equal((await store.get('cs_test_1')).status, 'needs_attention');
  assert.equal(await run(), 'needs_attention', 'further deliveries do not retry');
  assert.equal(calls.create.length, 1);
  assert.equal(calls.alerts.length, 1);
  assert.equal(calls.alerts[0].to[0], 'austin@example.com');
  assert.match(calls.alerts[0].text, /Pat Hunter <pat@example.com>/);
  assert.match(calls.alerts[0].text, /\$45\.98/);
  assert.match(calls.alerts[0].text, /cs_test_1/);
  assert.match(calls.alerts[0].text, /NOT retry/);
});

test('retries give up after the maximum number of attempts', async () => {
  const failures = Array.from({ length: MAX_ATTEMPTS }, () => new Error('Printify returned HTTP 500'));
  const { store, run } = harness({ createFails: failures });
  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) await assert.rejects(run(), /500/);
  assert.equal(await run(), 'needs_attention');
  assert.equal((await store.get('cs_test_1')).attempts, MAX_ATTEMPTS);
});

test('alerts are not sent on every retry', async () => {
  const { calls, run } = harness({ createFails: Array.from({ length: 4 }, () => new Error('boom')) });
  for (let i = 0; i < 4; i++) await assert.rejects(run(), /boom/);
  assert.equal(calls.alerts.length, 2, 'attempts 1 and 4');
});

test('a payment without a shipping address needs a human', async () => {
  const noAddress = paidSession();
  noAddress.recipient.address.line1 = '';
  const { calls, run } = harness({ session: noAddress });
  assert.equal(await run(), 'needs_attention');
  assert.equal(calls.create.length, 0);
  assert.equal(calls.alerts.length, 1);
});

test('a lost lease (crashed worker) lets another delivery take over', async () => {
  const store = memoryOrderStore();
  const first = await store.claim('s', 1_000);
  assert.equal(first.state, 'claimed');
  assert.equal((await store.claim('s', 2_000)).state, 'busy');
  assert.equal((await store.claim('s', 1_000 + 3 * 60 * 1000)).state, 'claimed');
});

test('alert failures never break order handling', async () => {
  const session = paidSession();
  const services = { payments: { retrieveSession: async () => session }, fulfiller: { createOrder: async () => { throw permanent('bad'); }, submitOrder: async () => {} } };
  const quiet = console.error;
  console.error = () => {};
  try {
    const result = await fulfillSession({ sessionId: 'cs_test_1', env: { RESEND_API_KEY: 'k', ALERT_EMAIL: 'a@b.co' }, services, store: memoryOrderStore(), fetcher: async () => { throw new Error('network down'); } });
    assert.equal(result, 'needs_attention');
  } finally { console.error = quiet; }
});
