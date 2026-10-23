import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePortalCommerce, normalizePortalProduct, portalFeedEnabled, portalProducts } from '../server/portal-feed.js';

const feedProduct = {
  id: '11', name: '606 Hoodie', thumbnail: 'https://files.cdn.printful.com/t.png', available: true, price_cents: 3950, currency: 'USD',
  variants: [
    { id: '901', size: 'M', color: 'Green', price_cents: 3950, currency: 'USD', available: true, image: 'https://files.cdn.printful.com/p.png' },
    { id: '902', size: 'L', color: 'Green', price_cents: 4100, currency: 'USD', available: false, image: 'http://insecure.test/x.png' }
  ]
};
const env = { PORTAL_FEED_KEY: 'k'.repeat(43) };
const feed = body => async (url, options) => { feed.last = { url: String(url), options }; return Response.json(body); };

test('portal feed maps Printful products into the storefront shape', () => {
  const product = normalizePortalProduct(feedProduct);
  assert.equal(product.id, '11');
  assert.equal(product.price, 39.5);
  assert.deepEqual(product.sizes, ['M', 'L']);
  assert.deepEqual(product.colors, ['Green']);
  assert.equal(product.category, 'Hoodies & Sweatshirts');
  assert.equal(product.variants[1].available, false);
  assert.equal(product.variants[1].image, null, 'non-https images are dropped');
  assert.equal(product.galleryByColor.Green.length, 1);
  assert.equal(product.provider, 'printful');
  assert.equal(normalizePortalProduct({ id: '1', name: 'x', variants: [] }), null);
});

test('portal feed sends the site key and returns normalized products', async () => {
  const result = await portalProducts(env, feed({ products: [feedProduct] }));
  assert.equal(result.mode, 'printful');
  assert.equal(result.products.length, 1);
  assert.equal(feed.last.options.headers.Authorization, `Bearer ${env.PORTAL_FEED_KEY}`);
});

test('portal commerce hides upstream detail, and is opt-in', async () => {
  assert.equal(portalFeedEnabled({}), false);
  assert.equal(portalFeedEnabled(env), true);
  const down = await handlePortalCommerce(new Request('https://x.test/api/products'), env, async () => new Response('secret detail', { status: 500 }));
  assert.equal(down.status, 502);
  assert.deepEqual(await down.json(), { error: 'The shop is temporarily unavailable.' });
  const commerce = await (await handlePortalCommerce(new Request('https://x.test/api/commerce'), env)).json();
  assert.equal(commerce.checkoutEnabled, true);
  assert.equal((await handlePortalCommerce(new Request('https://x.test/api/checkout'), env)).status, 405);
});

import { handleCheckout } from '../server/portal-feed.js';

const checkoutRequest = body => new Request('https://chasing606.example/api/checkout', { method: 'POST', body: JSON.stringify(body) });
const good = { lines: [{ merchandiseId: '901', quantity: 2 }] };

test('checkout forwards only variants and quantities, with return addresses on this site', async () => {
  let sent;
  const fetcher = async (url, options) => { sent = { url: String(url), options, body: JSON.parse(options.body) }; return Response.json({ url: 'https://checkout.stripe.com/c/pay/cs_1' }); };
  const response = await handleCheckout(checkoutRequest({ lines: [{ merchandiseId: '901', quantity: 2, price: 1 }], success_url: 'https://evil.test' }), env, fetcher);
  assert.deepEqual(await response.json(), { checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_1' });
  assert.deepEqual(sent.body, { lines: [{ variant_id: '901', quantity: 2 }], success_url: 'https://chasing606.example/merch?order=success', cancel_url: 'https://chasing606.example/merch' });
  assert.equal(sent.options.headers.Authorization, `Bearer ${env.PORTAL_FEED_KEY}`);
});

test('checkout rejects bad carts before calling the portal and keeps upstream errors generic', async () => {
  const never = async () => { throw new Error('should not be called'); };
  for (const lines of [[], [{ merchandiseId: 'gid://x', quantity: 1 }], [{ merchandiseId: '1', quantity: 11 }], [{ merchandiseId: '1', quantity: 1.5 }]]) {
    assert.equal((await handleCheckout(checkoutRequest({ lines }), env, never)).status, 400);
  }
  const cartProblem = await handleCheckout(checkoutRequest(good), env, async () => Response.json({ error: 'An item in your cart is no longer available.' }, { status: 409 }));
  assert.equal(cartProblem.status, 409);
  assert.equal((await cartProblem.json()).error, 'An item in your cart is no longer available.');
  const outage = await handleCheckout(checkoutRequest(good), env, async () => Response.json({ error: 'Printful token expired at acct_123' }, { status: 503 }));
  assert.equal(outage.status, 502);
  assert.equal((await outage.json()).error, 'Checkout is temporarily unavailable.');
  const wrongHost = await handleCheckout(checkoutRequest(good), env, async () => Response.json({ url: 'https://evil.test/pay' }));
  assert.equal(wrongHost.status, 502);
});
