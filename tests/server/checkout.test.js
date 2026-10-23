import test from 'node:test';
import assert from 'node:assert/strict';
import { CheckoutError, decodeBag, encodeBag, orderStatus, priceBag, shippingFor, startCheckout } from '../../server/checkout.js';

const products = [
  {
    id: 'p1', name: 'Hoodie', colors: [{ name: 'Black', images: ['https://images-api.printify.com/h.jpg'] }],
    variants: [
      { id: 1, color: 'Black', size: 'M', price: 39.99, available: true },
      { id: 2, color: 'Black', size: 'L', price: 39.99, available: false }
    ]
  },
  { id: 'p2', name: 'Sticker', colors: [{ name: 'Standard', images: [] }], variants: [{ id: 3, color: 'Standard', size: 'One size', price: 4.99, available: true }] }
];

test('the bag is priced from the catalog, merging duplicate lines', () => {
  const { lines, subtotalCents } = priceBag([
    { productId: 'p1', variantId: 1, quantity: 1, price: 0.01 }, // a tampered price is ignored
    { productId: 'p1', variantId: 1, quantity: 2 },
    { productId: 'p2', variantId: 3, quantity: 1 }
  ], products);
  assert.equal(lines.length, 2);
  assert.deepEqual([lines[0].quantity, lines[0].unitCents, lines[0].description], [3, 3999, 'Black / M']);
  assert.equal(lines[1].description, '');
  assert.equal(subtotalCents, 3 * 3999 + 499);
});

test('unknown, sold-out, empty and oversized bags are refused', () => {
  const bad = (items, pattern, status) => assert.throws(() => priceBag(items, products), error => error instanceof CheckoutError && pattern.test(error.message) && error.status === status);
  bad([], /empty/, 400);
  bad('nope', /empty/, 400);
  bad([{ productId: 'p1', variantId: 99, quantity: 1 }], /no longer sold/, 409);
  bad([{ productId: 'zzz', variantId: 1, quantity: 1 }], /no longer sold/, 409);
  bad([{ productId: 'p1', variantId: 2, quantity: 1 }], /sold out/, 409);
  bad([{ productId: 'p1', variantId: 1, quantity: 0 }], /quantity/, 400);
  bad([{ productId: 'p1', variantId: 1, quantity: 1.5 }], /quantity/, 400);
  bad([{ productId: 'p1', variantId: 1, quantity: 11 }], /quantity/, 400);
  bad(Array.from({ length: 11 }, (_, i) => ({ productId: 'p1', variantId: i + 100, quantity: 1 })), /10 or fewer/, 400);
});

test('quantities merged across lines are capped at 10', () => {
  const { lines } = priceBag([{ productId: 'p1', variantId: 1, quantity: 8 }, { productId: 'p1', variantId: 1, quantity: 8 }], products);
  assert.equal(lines[0].quantity, 10);
});

test('shipping is a flat rate, free once the subtotal reaches the threshold', () => {
  const config = { flatCents: 599, freeOverCents: 7500 };
  assert.deepEqual(shippingFor(7499, config), { cents: 599, label: 'Standard shipping' });
  assert.deepEqual(shippingFor(7500, config), { cents: 0, label: 'Free shipping' });
  assert.equal(shippingFor(100000, { flatCents: 599, freeOverCents: 0 }).cents, 599, 'a zero threshold turns free shipping off');
});

test('the bag survives the round trip through Stripe metadata', () => {
  const lines = [{ productId: '5d39b159e7c48c000728c89f', variantId: 1001, quantity: 2 }, { productId: 'abc', variantId: 7, quantity: 1 }];
  assert.deepEqual(decodeBag(encodeBag(lines)), lines);
  assert.throws(() => decodeBag(''), CheckoutError);
  assert.throws(() => decodeBag('p:notanumber:1'), CheckoutError);
  const huge = Array.from({ length: 10 }, (_, i) => ({ productId: 'x'.repeat(60), variantId: i, quantity: 1 }));
  assert.throws(() => encodeBag(huge), /too large/);
});

const post = (body, headers = {}) => new Request('https://site.test/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('starting checkout sends server-computed prices, shipping and a return URL to the payment provider', async () => {
  let received;
  const services = { automaticTax: false, payments: { createSession: async input => { received = input; return { id: 'cs_test_1', clientSecret: 'secret' }; } } };
  const result = await startCheckout({ request: post({ items: [{ productId: 'p2', variantId: 3, quantity: 2 }] }), env: {}, services, products });
  assert.deepEqual(result, { sessionId: 'cs_test_1', clientSecret: 'secret' });
  assert.equal(received.lines[0].unitCents, 499);
  assert.deepEqual(received.shipping, { cents: 599, label: 'Standard shipping' });
  assert.deepEqual(received.countries, ['US']);
  assert.equal(received.cart, 'p2:3:2');
  assert.equal(received.returnUrl, 'https://site.test/order/complete?session_id={CHECKOUT_SESSION_ID}');
});

test('settings change the shipping rate and threshold', async () => {
  let received;
  const services = { payments: { createSession: async input => { received = input; return { id: 'cs_test_1', clientSecret: 's' }; } } };
  await startCheckout({ request: post({ items: [{ productId: 'p1', variantId: 1, quantity: 2 }] }), env: { SHIPPING_FLAT_CENTS: '799', FREE_SHIPPING_OVER_CENTS: '5000' }, services, products });
  assert.deepEqual(received.shipping, { cents: 0, label: 'Free shipping' });
});

test('cross-site and non-JSON checkout requests are refused', async () => {
  const services = { payments: { createSession: async () => assert.fail('must not be called') } };
  const items = [{ productId: 'p2', variantId: 3, quantity: 1 }];
  await assert.rejects(startCheckout({ request: post({ items }, { Origin: 'https://evil.test' }), env: {}, services, products }), error => error.status === 403);
  const form = new Request('https://site.test/api/checkout', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ items }) });
  await assert.rejects(startCheckout({ request: form, env: {}, services, products }), error => error.status === 415);
  await assert.doesNotReject(startCheckout({ request: post({ items }, { Origin: 'https://site.test' }), env: {}, services: { payments: { createSession: async () => ({ id: 'cs_test_1', clientSecret: 's' }) } }, products }));
});

test('the order page only learns paid-or-not and the receipt address', async () => {
  const services = { payments: { retrieveSession: async id => ({ id, status: 'complete', paid: true, email: 'a@b.co', recipient: { name: 'Pat' }, cart: 'secret' }) } };
  assert.deepEqual(await orderStatus('cs_test_abcdefghij', services), { status: 'complete', paid: true, email: 'a@b.co' });
  await assert.rejects(orderStatus('../../etc/passwd', services), CheckoutError);
  await assert.rejects(orderStatus(undefined, services), CheckoutError);
});
