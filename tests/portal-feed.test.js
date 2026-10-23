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

test('portal commerce hides upstream detail, keeps checkout closed, and is opt-in', async () => {
  assert.equal(portalFeedEnabled({}), false);
  assert.equal(portalFeedEnabled(env), true);
  const down = await handlePortalCommerce(new Request('https://x.test/api/products'), env, async () => new Response('secret detail', { status: 500 }));
  assert.equal(down.status, 502);
  assert.deepEqual(await down.json(), { error: 'The shop is temporarily unavailable.' });
  const commerce = await (await handlePortalCommerce(new Request('https://x.test/api/commerce'), env)).json();
  assert.equal(commerce.checkoutEnabled, false);
  assert.equal((await handlePortalCommerce(new Request('https://x.test/api/checkout', { method: 'POST' }), env)).status, 409);
});
