import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSpringCommerce, normalizeSpringProduct, parseSpringCatalog } from '../server/spring.js';

const rawProduct = {
  currency: 'USD', description: 'Warm hunting hoodie', listingId: 123, primaryProductId: 212,
  primaryProductType: 'Hoodie', title: '606 Hoodie', url: '606-hoodie',
  primaryProduct: [{
    color: 'Forest Green', variationId: 55, currency: 'USD', inventoryCount: 2,
    availableSizes: [{ id: 7, label: 'M', price: '34.99' }],
    sizes: [{ id: 7, label: 'M', price: '34.99' }, { id: 8, label: 'L', price: '34.99' }],
    images: [
      { label: 'front', full: 'https://mockup-api.teespring.com/front/1200.jpg' },
      { label: 'back', src: '//mockup-api.teespring.com/back/800.jpg' }
    ]
  }]
};

function flightHtml(products = [rawProduct]) {
  const tree = ['$', 'component', null, { children: { products, page: 1, pages: 1 } }];
  const part = `9:${JSON.stringify(tree)}`;
  return `<script>self.__next_f.push([1,${JSON.stringify(part)}])</script>`;
}

test('Spring flight data parses into safe storefront products and exact listing links', () => {
  const parsed = parseSpringCatalog(flightHtml());
  assert.equal(parsed.length, 1);
  const product = normalizeSpringProduct(parsed[0]);
  assert.equal(product.id, '123-212');
  assert.equal(product.price, 34.99);
  assert.deepEqual(product.colors, ['Forest Green']);
  assert.deepEqual(product.sizes, ['M']);
  assert.equal(product.galleryByColor['Forest Green'].length, 2);
  assert.equal(product.shopUrl, 'https://chasing606.creator-spring.com/listing/606-hoodie?product=212');
  assert.equal(product.variants[0].available, true);
});

test('Spring catalog rejects untrusted image and listing URLs', () => {
  const unsafe = structuredClone(rawProduct);
  unsafe.url = 'https://evil.test/item';
  assert.equal(normalizeSpringProduct(unsafe), null);
  const safe = structuredClone(rawProduct);
  safe.primaryProduct[0].images = [{ src: 'https://evil.test/image.jpg' }];
  assert.equal(normalizeSpringProduct(safe).image, null);
});

test('Spring API exposes products without credentials and sends checkout to the hosted shop', async () => {
  const fetcher = async () => new Response(flightHtml([rawProduct, rawProduct]), { status: 200 });
  const productsResponse = await handleSpringCommerce(new Request('https://site.test/api/products'), fetcher);
  const catalog = await productsResponse.json();
  assert.equal(catalog.mode, 'spring');
  assert.equal(catalog.products.length, 1);
  const checkout = await handleSpringCommerce(new Request('https://site.test/api/checkout', { method: 'POST' }), fetcher);
  assert.equal(checkout.status, 410);
  assert.equal((await checkout.json()).shopUrl, 'https://chasing606.creator-spring.com');
});
