import test from 'node:test';
import assert from 'node:assert/strict';
import { formEncode, normalizeSession, signWebhook, stripePayments, STRIPE_API_VERSION, verifyWebhook } from '../../server/stripe.js';

const decode = body => Object.fromEntries(new URLSearchParams(body));

test('nested objects and arrays are form-encoded the way Stripe expects', () => {
  assert.deepEqual(formEncode({ a: { b: [1, { c: 'x y' }] }, skip: undefined, flag: false }).map(decodeURIComponent), ['a[b][0]=1', 'a[b][1][c]=x y', 'flag=false']);
});

test('a checkout session is created with server prices, address collection and shipping', async () => {
  let sent;
  const fetcher = async (url, init) => { sent = { url, init, body: decode(init.body) }; return Response.json({ id: 'cs_test_abc', client_secret: 'cs_test_abc_secret_x' }); };
  const payments = stripePayments({ secretKey: 'sk_test_1' }, fetcher);
  const result = await payments.createSession({
    lines: [{ name: 'Hoodie', description: 'Black / M', image: 'https://images-api.printify.com/a.jpg', unitCents: 3999, quantity: 2 }],
    shipping: { cents: 599, label: 'Standard shipping' }, countries: ['US'], returnUrl: 'https://site.test/order/complete?session_id={CHECKOUT_SESSION_ID}',
    cart: 'p1:1001:2', automaticTax: false
  });
  assert.deepEqual(result, { id: 'cs_test_abc', clientSecret: 'cs_test_abc_secret_x' });
  assert.equal(sent.url, 'https://api.stripe.com/v1/checkout/sessions');
  assert.equal(sent.init.headers['Stripe-Version'], STRIPE_API_VERSION);
  assert.equal(sent.init.headers.Authorization, 'Bearer sk_test_1');
  assert.equal(sent.body.ui_mode, 'embedded_page');
  assert.equal(sent.body.mode, 'payment');
  assert.equal(sent.body['line_items[0][price_data][unit_amount]'], '3999');
  assert.equal(sent.body['line_items[0][quantity]'], '2');
  assert.equal(sent.body['metadata[cart]'], 'p1:1001:2');
  assert.equal(sent.body['shipping_address_collection[allowed_countries][0]'], 'US');
  assert.equal(sent.body['shipping_options[0][shipping_rate_data][fixed_amount][amount]'], '599');
  assert.equal(sent.body['phone_number_collection[enabled]'], 'true');
  assert.equal(sent.body['automatic_tax[enabled]'], undefined);
});

test('automatic tax marks prices as tax-exclusive', async () => {
  let body;
  const fetcher = async (_url, init) => { body = decode(init.body); return Response.json({ id: 'cs_test_abc', client_secret: 's' }); };
  await stripePayments({ secretKey: 'k' }, fetcher).createSession({ lines: [{ name: 'x', unitCents: 100, quantity: 1 }], shipping: { cents: 0, label: 'Free shipping' }, countries: ['US'], returnUrl: 'r', cart: 'c', automaticTax: true });
  assert.equal(body['automatic_tax[enabled]'], 'true');
  assert.equal(body['line_items[0][price_data][tax_behavior]'], 'exclusive');
  assert.equal(body['shipping_options[0][shipping_rate_data][tax_behavior]'], 'exclusive');
});

test('Stripe errors surface their status without exposing the key', async () => {
  const fetcher = async () => Response.json({ error: { message: 'Invalid API Key provided' } }, { status: 401 });
  await assert.rejects(stripePayments({ secretKey: 'sk_test_secret' }, fetcher).retrieveSession('cs_test_1'), error => error.status === 401 && !error.message.includes('sk_test_secret'));
});

test('sessions are normalized from both old and new address locations', () => {
  const address = { line1: '1 Main', city: 'Hazard', state: 'KY', postal_code: '41701', country: 'US' };
  const base = { id: 'cs_test_1', status: 'complete', payment_status: 'paid', amount_total: 4598, metadata: { cart: 'p:1:1' }, customer_details: { email: 'a@b.co', name: 'Billing Name', phone: '555' } };
  const fresh = normalizeSession({ ...base, collected_information: { shipping_details: { name: 'Pat', address } } });
  const legacy = normalizeSession({ ...base, shipping_details: { name: 'Pat', address } });
  assert.deepEqual(fresh, legacy);
  assert.equal(fresh.paid, true);
  assert.equal(fresh.recipient.name, 'Pat');
  assert.equal(fresh.recipient.address.postalCode, '41701');
  assert.equal(normalizeSession({ ...base, payment_status: 'unpaid' }).paid, false);
});

test('webhook signatures: valid passes; tampering, wrong secret, and stale timestamps fail', async () => {
  const body = '{"type":"checkout.session.completed","data":{"object":{"id":"cs_test_1"}}}';
  const header = await signWebhook('whsec_test', body);
  assert.equal((await verifyWebhook('whsec_test', body, header)).type, 'checkout.session.completed');
  await assert.rejects(verifyWebhook('whsec_test', body + ' ', header), /does not match/);
  await assert.rejects(verifyWebhook('whsec_other', body, header), /does not match/);
  await assert.rejects(verifyWebhook('whsec_test', body, ''), /Missing/);
  const old = await signWebhook('whsec_test', body, Math.floor(Date.now() / 1000) - 3600);
  await assert.rejects(verifyWebhook('whsec_test', body, old), /too old/);
  // Only v1 signatures count: a forged "v0" alone is rejected.
  await assert.rejects(verifyWebhook('whsec_test', body, header.replace('v1=', 'v0=')), /Missing/);
});

test('a webhook header with several signatures (rolled secret) passes if any match', async () => {
  const body = '{"a":1}';
  const good = await signWebhook('whsec_new', body);
  const header = `${good},v1=${'0'.repeat(64)}`;
  assert.deepEqual(await verifyWebhook('whsec_new', body, header), { a: 1 });
});
