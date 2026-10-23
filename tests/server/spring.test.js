import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSpringCatalog, normalizeSpringProduct, parseSpringCatalog, SPRING_STORE_URL } from '../../server/spring.js';

const rawProduct = {
  currency: 'USD', description: 'Warm hunting hoodie', listingId: 123, primaryProductId: 212,
  primaryProductType: 'Hoodie', title: '606 Hoodie', url: '606-hoodie',
  primaryProduct: [{
    color: 'Forest Green', variationId: 55, currency: 'USD', inventoryCount: 2, productType: 'Unisex Pullover Hoodie',
    attributes: { hex: '#4D6949' },
    availableSizes: [{ id: 7, label: 'M', price: '34.99' }],
    sizes: [{ id: 7, label: 'M', price: '34.99' }, { id: 8, label: 'L', price: '36.99' }],
    images: [
      { label: 'front', full: 'https://mockup-api.teespring.com/front/1200.jpg' },
      { label: 'back', src: '//mockup-api.teespring.com/back/800.jpg' },
      { label: 'dupe', src: 'https://mockup-api.teespring.com/back/800.jpg' }
    ]
  }]
};

const soldOut = {
  ...rawProduct, listingId: 124, title: 'Sold out tee', url: 'sold-out-tee', primaryProductType: 'Sublimated Tee',
  primaryProduct: [{
    color: 'Standard', currency: 'USD', inventoryCount: 0, productType: 'All-Over Print Unisex Tee',
    sizes: [{ id: 1, label: 'M', price: '32.99' }], availableSizes: [], images: []
  }]
};

function flightHtml(products = [rawProduct]) {
  const tree = ['$', 'component', null, { children: { products, page: 1, pages: 1 } }];
  const part = `9:${JSON.stringify(tree)}`;
  return `<script>self.__next_f.push([1,${JSON.stringify(part)}])</script>`;
}

test('Spring flight data becomes a compact product with an exact listing link', () => {
  const parsed = parseSpringCatalog(flightHtml());
  assert.equal(parsed.length, 1);
  const product = normalizeSpringProduct(parsed[0]);
  assert.equal(product.id, '123-212');
  assert.equal(product.price, 34.99);
  assert.equal(product.category, 'Hoodies & Sweatshirts');
  assert.equal(product.available, true);
  assert.deepEqual(product.sizes, ['M', 'L']);
  assert.equal(product.shopUrl, `${SPRING_STORE_URL}/listing/606-hoodie?product=212`);
  assert.deepEqual(product.colors, [{
    name: 'Forest Green',
    hex: '#4d6949',
    images: ['https://mockup-api.teespring.com/front/1200.jpg', 'https://mockup-api.teespring.com/back/800.jpg']
  }]);
});

test('sizes that are not currently orderable stay listed as unavailable', () => {
  const { variants } = normalizeSpringProduct(rawProduct);
  assert.deepEqual(variants, [
    { color: 'Forest Green', size: 'M', price: 34.99, available: true },
    { color: 'Forest Green', size: 'L', price: 36.99, available: false }
  ]);
});

test('sold-out products keep their real price instead of $0', () => {
  const product = normalizeSpringProduct(soldOut);
  assert.equal(product.available, false);
  assert.equal(product.price, 32.99);
  assert.equal(product.category, 'T-Shirts');
});

test('Spring catalog rejects untrusted image and listing URLs', () => {
  const unsafeLink = structuredClone(rawProduct);
  unsafeLink.url = 'https://evil.test/item';
  assert.equal(normalizeSpringProduct(unsafeLink), null);

  const unsafeImage = structuredClone(rawProduct);
  unsafeImage.primaryProduct[0].images = [{ src: 'https://evil.test/image.jpg' }];
  assert.deepEqual(normalizeSpringProduct(unsafeImage).colors[0].images, []);
});

test('changed storefront markup is reported instead of returning an empty shop', async () => {
  assert.throws(() => parseSpringCatalog('<html>no data</html>'), /format changed/);
  await assert.rejects(loadSpringCatalog(async () => new Response('<html></html>')), /format changed/);
  await assert.rejects(loadSpringCatalog(async () => new Response('', { status: 500 })), /temporarily unavailable/);
});

test('catalog loader de-duplicates listings', async () => {
  const catalog = await loadSpringCatalog(async () => new Response(flightHtml([rawProduct, rawProduct, soldOut])));
  assert.equal(catalog.products.length, 2);
  assert.equal(catalog.shopUrl, SPRING_STORE_URL);
});
