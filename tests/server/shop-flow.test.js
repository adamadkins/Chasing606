import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../../server/api.js';
import { signWebhook } from '../../server/stripe.js';

// A pretend Stripe and Printify, reached through the same fetch the Worker uses.
function world(sessionId = 'cs_test_flow1234567890') {
  const log = { stripe: [], printify: [] };
  const sessions = new Map();
  const printifyProduct = {
    id: 'prod1', title: 'Chasing 606 Hoodie', description: '<p>Warm.</p>', tags: ['Hoodies'], visible: true,
    options: [{ name: 'Colors', type: 'color', values: [{ id: 1, title: 'Black', colors: ['#000000'] }] }, { name: 'Sizes', type: 'size', values: [{ id: 2, title: 'M' }, { id: 3, title: 'L' }] }],
    variants: [{ id: 501, price: 3999, is_enabled: true, is_available: true, options: [1, 2] }, { id: 502, price: 3999, is_enabled: true, is_available: false, options: [1, 3] }],
    images: [{ src: 'https://images-api.printify.com/a.jpg', variant_ids: [501], position: 'front', is_default: true }]
  };
  const fetcher = async (url, init = {}) => {
    const { hostname, pathname } = new URL(url);
    if (hostname === 'api.printify.com') {
      log.printify.push({ method: init.method ?? 'GET', pathname, body: init.body && JSON.parse(init.body) });
      if (pathname.endsWith('/products.json')) return Response.json({ current_page: 1, last_page: 1, data: [printifyProduct] });
      if (pathname.endsWith('/orders.json')) return Response.json({ id: 'printify-order-1' });
      if (pathname.endsWith('/send_to_production.json')) return Response.json({});
    }
    if (hostname === 'api.stripe.com') {
      const form = init.body ? Object.fromEntries(new URLSearchParams(init.body)) : null;
      log.stripe.push({ method: init.method ?? 'GET', pathname, form });
      if (init.method === 'POST') {
        const id = sessionId;
        sessions.set(id, { id, status: 'open', payment_status: 'unpaid', amount_total: 0, metadata: { cart: form['metadata[cart]'] }, client_secret: `${id}_secret` });
        return Response.json(sessions.get(id));
      }
      const id = pathname.split('/').pop();
      return Response.json(sessions.get(id));
    }
    throw new Error(`Unexpected request to ${url}`);
  };
  const pay = id => Object.assign(sessions.get(id), {
    status: 'complete', payment_status: 'paid', amount_total: 4598,
    customer_details: { email: 'pat@example.com', phone: '555' },
    collected_information: { shipping_details: { name: 'Pat Hunter', address: { line1: '1 Main St', city: 'Hazard', state: 'KY', postal_code: '41701', country: 'US' } } }
  });
  return { fetcher, log, pay };
}

const env = {
  PRINTIFY_API_TOKEN: 'ptok', PRINTIFY_SHOP_ID: '77',
  STRIPE_SECRET_KEY: 'sk_test_1', STRIPE_PUBLISHABLE_KEY: 'pk_test_1', STRIPE_WEBHOOK_SECRET: 'whsec_flow',
  ALLOW_MEMORY_ORDER_STORE: 'true'
};
const call = (path, init, options) => handleApi(new Request(`https://site.test${path}`, init), options);
const webhook = async body => {
  const raw = JSON.stringify(body);
  return { method: 'POST', headers: { 'Stripe-Signature': await signWebhook('whsec_flow', raw) }, body: raw };
};

test('products come from Printify and tell the browser how checkout works', async () => {
  const { fetcher } = world();
  const response = await call('/api/products', {}, { env, fetcher });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.products[0].name, 'Chasing 606 Hoodie');
  assert.equal(body.products[0].variants[0].id, 501);
  assert.deepEqual(body.checkout, { mode: 'stripe', publishableKey: 'pk_test_1', shipping: { flatCents: 599, freeOverCents: 7500 }, automaticTax: false });
  assert.doesNotMatch(JSON.stringify(body), /sk_test|whsec_|ptok/, 'no secrets reach the browser');
});

test('a full order: bag → Stripe session → paid webhook → Printify order, exactly once', async () => {
  const FULL = 'cs_test_fullflow1234567890';
  const { fetcher, log, pay } = world(FULL);

  const checkout = await call('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ productId: 'prod1', variantId: 501, quantity: 2, price: 1 }] }) }, { env, fetcher });
  assert.equal(checkout.status, 200);
  assert.deepEqual(await checkout.json(), { sessionId: FULL, clientSecret: `${FULL}_secret` });
  const created = log.stripe.find(entry => entry.method === 'POST').form;
  assert.equal(created['line_items[0][price_data][unit_amount]'], '3999', 'price comes from Printify, not the browser');
  assert.equal(created['metadata[cart]'], 'prod1:501:2');

  // Payment completes, Stripe calls us.
  pay(FULL);
  const event = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: FULL } } };
  const first = await call('/api/stripe-webhook', await webhook(event), { env, fetcher });
  assert.equal(first.status, 200);
  assert.equal((await first.json()).result, 'submitted');

  const orders = log.printify.filter(entry => entry.pathname.endsWith('/orders.json'));
  assert.equal(orders.length, 1);
  assert.deepEqual(orders[0].body.line_items, [{ product_id: 'prod1', variant_id: 501, quantity: 2 }]);
  assert.equal(orders[0].body.address_to.zip, '41701');
  assert.equal(log.printify.filter(entry => entry.pathname.endsWith('/send_to_production.json')).length, 1);

  // Stripe delivers the same event again.
  const again = await call('/api/stripe-webhook', await webhook(event), { env, fetcher });
  assert.equal((await again.json()).result, 'already');
  assert.equal(log.printify.filter(entry => entry.pathname.endsWith('/orders.json')).length, 1, 'no duplicate order');

  // The thank-you page can confirm the payment.
  const status = await call(`/api/order-status?session_id=${FULL}`, {}, { env, fetcher });
  assert.deepEqual(await status.json(), { status: 'complete', paid: true, email: 'pat@example.com' });
});

test('webhooks with a bad signature are rejected and change nothing', async () => {
  const { fetcher, log } = world();
  const raw = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_forged1234567890' } } });
  const forged = await call('/api/stripe-webhook', { method: 'POST', headers: { 'Stripe-Signature': await signWebhook('whsec_wrong', raw) }, body: raw }, { env, fetcher });
  assert.equal(forged.status, 400);
  const unsigned = await call('/api/stripe-webhook', { method: 'POST', body: raw }, { env, fetcher });
  assert.equal(unsigned.status, 400);
  assert.equal(log.printify.length, 0);
});

test('unrelated Stripe events are acknowledged and ignored', async () => {
  const { fetcher, log } = world();
  const response = await call('/api/stripe-webhook', await webhook({ type: 'charge.updated', data: { object: { id: 'ch_1' } } }), { env, fetcher });
  assert.equal(response.status, 200);
  assert.equal(log.printify.length, 0);
});

test('a retryable supplier failure answers 500 so Stripe redelivers', async () => {
  const RETRY = 'cs_test_retry1234567890';
  const { fetcher, pay } = world(RETRY);
  const failing = async (url, init) => (String(url).endsWith('/orders.json') ? new Response('{}', { status: 503 }) : fetcher(url, init));
  await call('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ productId: 'prod1', variantId: 501, quantity: 1 }]}) }, { env, fetcher });
  pay(RETRY);
  const quiet = console.error;
  console.error = () => {};
  try {
    const response = await call('/api/stripe-webhook', await webhook({ type: 'checkout.session.completed', data: { object: { id: RETRY } } }), { env: { ...env, ALLOW_MEMORY_ORDER_STORE: 'true' }, fetcher: failing });
    assert.equal(response.status, 500);
  } finally { console.error = quiet; }
});

test('without an order database the webhook refuses to run rather than risk double orders', async () => {
  const { fetcher } = world();
  const quiet = console.error;
  console.error = () => {};
  try {
    const production = { ...env, ALLOW_MEMORY_ORDER_STORE: undefined };
    const response = await call('/api/stripe-webhook', await webhook({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_nodb1234567890' } } }), { env: production, fetcher });
    assert.equal(response.status, 500);
  } finally { console.error = quiet; }
});

test('in the current Spring mode checkout endpoints are closed', async () => {
  assert.equal((await call('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, { env: {} })).status, 503);
  assert.equal((await call('/api/stripe-webhook', { method: 'POST', body: '{}' }, { env: {} })).status, 404);
  assert.equal((await call('/api/demo/pay', { method: 'POST', body: '{}' }, { env: {} })).status, 404);
});

test('demo mode runs the whole flow with no accounts', async () => {
  const demoEnv = { SHOP_MODE: 'demo' };
  const catalog = await (await call('/api/products', {}, { env: demoEnv })).json();
  assert.equal(catalog.checkout.mode, 'demo');
  const product = catalog.products.find(candidate => candidate.available);
  const variant = product.variants.find(candidate => candidate.available);
  const started = await (await call('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ productId: product.id, variantId: variant.id, quantity: 1 }] }) }, { env: demoEnv })).json();
  assert.match(started.sessionId, /^cs_test_demo/);
  const paid = await call('/api/demo/pay', { method: 'POST', body: JSON.stringify({ sessionId: started.sessionId, recipient: { name: 'Pat', email: 'p@e.co', address: { line1: '1 Main', city: 'Hazard', state: 'KY', postalCode: '41701', country: 'US' } } }) }, { env: demoEnv });
  assert.equal((await paid.json()).result, 'submitted');
  const status = await (await call(`/api/order-status?session_id=${started.sessionId}`, {}, { env: demoEnv })).json();
  assert.equal(status.paid, true);
});
