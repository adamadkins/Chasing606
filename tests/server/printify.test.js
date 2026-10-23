import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrintifyOrder, htmlToText, loadPrintifyCatalog, normalizePrintifyProduct, sendToProduction } from '../../server/printify.js';

const rawProduct = (overrides = {}) => ({
  id: '5d39b159e7c48c000728c89f',
  title: 'Chasing 606 Classic Hoodie',
  description: '<p>Soft &amp; warm.</p><ul><li>50% cotton</li><li>Pouch pocket</li></ul>',
  tags: ['Hoodies', "Men's Clothing"],
  visible: true,
  options: [
    { name: 'Colors', type: 'color', values: [{ id: 521, title: 'Black', colors: ['#000000'] }, { id: 522, title: 'Safety Orange', colors: ['#E8620F'] }] },
    { name: 'Sizes', type: 'size', values: [{ id: 14, title: 'S' }, { id: 15, title: 'M' }, { id: 16, title: '2XL' }] }
  ],
  variants: [
    { id: 1001, price: 3999, is_enabled: true, is_available: true, options: [521, 14] },
    { id: 1002, price: 3999, is_enabled: true, is_available: false, options: [521, 15] },
    { id: 1003, price: 4299, is_enabled: true, is_available: true, options: [522, 16] },
    { id: 1004, price: 3999, is_enabled: false, is_available: true, options: [522, 14] }
  ],
  images: [
    { src: 'https://images-api.printify.com/mockup/a/1001/1/back.jpg', variant_ids: [1001, 1002], position: 'back', is_default: false },
    { src: 'https://images-api.printify.com/mockup/a/1001/2/front.jpg', variant_ids: [1001, 1002], position: 'front', is_default: true },
    { src: 'https://images-api.printify.com/mockup/b/1003/1/front.jpg', variant_ids: [1003], position: 'front', is_default: false },
    { src: 'https://evil.example/x.jpg', variant_ids: [1001], position: 'front' }
  ],
  ...overrides
});

test('a Printify product becomes the site product shape', () => {
  const product = normalizePrintifyProduct(rawProduct());
  assert.equal(product.id, '5d39b159e7c48c000728c89f');
  assert.equal(product.category, 'Hoodies & Sweatshirts');
  assert.deepEqual(product.sizes, ['S', 'M', '2XL']);
  assert.deepEqual(product.colors.map(color => [color.name, color.hex]), [['Black', '#000000'], ['Safety Orange', '#e8620f']]);
  assert.equal(product.price, 39.99);
  assert.equal(product.available, true);
  assert.equal(product.description, 'Soft & warm.\n\n• 50% cotton\n• Pouch pocket');
});

test('disabled variants are not sold; availability is per variant', () => {
  const { variants } = normalizePrintifyProduct(rawProduct());
  assert.deepEqual(variants.map(v => [v.id, v.color, v.size, v.price, v.available]), [
    [1001, 'Black', 'S', 39.99, true],
    [1002, 'Black', 'M', 39.99, false],
    [1003, 'Safety Orange', '2XL', 42.99, true]
  ]);
});

test('photos are matched to their color, front first, and only from Printify hosts', () => {
  const { colors } = normalizePrintifyProduct(rawProduct());
  assert.deepEqual(colors[0].images, ['https://images-api.printify.com/mockup/a/1001/2/front.jpg', 'https://images-api.printify.com/mockup/a/1001/1/back.jpg']);
  assert.deepEqual(colors[1].images, ['https://images-api.printify.com/mockup/b/1003/1/front.jpg']);
});

test('hidden or unsellable products are skipped', () => {
  assert.equal(normalizePrintifyProduct(rawProduct({ visible: false })), null);
  assert.equal(normalizePrintifyProduct(rawProduct({ variants: [] })), null);
  assert.equal(normalizePrintifyProduct(rawProduct({ variants: [{ id: 1, price: 0, is_enabled: true, options: [521, 14] }] })), null);
});

test('products without a color option get a single "Standard" color; extra options join the size', () => {
  const mug = normalizePrintifyProduct(rawProduct({
    title: 'Chasing 606 Mug', tags: ['Mugs'],
    options: [{ name: 'Size', type: 'size', values: [{ id: 1, title: '11oz' }] }, { name: 'Finish', type: 'surface', values: [{ id: 2, title: 'Matte' }] }],
    variants: [{ id: 9, price: 1599, is_enabled: true, is_available: true, options: [1, 2] }],
    images: []
  }));
  assert.equal(mug.category, 'Drinkware');
  assert.deepEqual(mug.colors, [{ name: 'Standard', hex: null, images: [] }]);
  assert.deepEqual(mug.sizes, ['11oz / Matte']);
});

test('hats are recognised as their own category', () => {
  assert.equal(normalizePrintifyProduct(rawProduct({ title: 'Chasing 606 Trucker Hat', tags: ['Hats'] })).category, 'Hats');
});

test('HTML descriptions become readable text', () => {
  assert.equal(htmlToText('<p>One</p><p>Two<br>three &lt;ok&gt;</p>'), 'One\n\nTwo\nthree <ok>');
});

test('the catalog loader walks every page, sends the token, and skips bad products', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, auth: init.headers.Authorization, agent: init.headers['User-Agent'] });
    const page = Number(new URL(url).searchParams.get('page'));
    return Response.json({ current_page: page, last_page: 2, data: [rawProduct({ id: `p${page}` }), rawProduct({ id: `hidden${page}`, visible: false })] });
  };
  const products = await loadPrintifyCatalog({ PRINTIFY_API_TOKEN: 'tok', PRINTIFY_SHOP_ID: '77' }, fetcher);
  assert.deepEqual(products.map(p => p.id), ['p1', 'p2']);
  assert.match(calls[0].url, /\/v1\/shops\/77\/products\.json\?limit=50&page=1$/);
  assert.equal(calls[0].auth, 'Bearer tok');
  assert.ok(calls[0].agent);
});

test('orders are created with the recipient, standard shipping, and tracking emails', async () => {
  let sent;
  const fetcher = async (url, init) => { sent = { url, init, body: JSON.parse(init.body) }; return Response.json({ id: 'abc123' }); };
  const result = await createPrintifyOrder({ PRINTIFY_API_TOKEN: 't', PRINTIFY_SHOP_ID: '77' }, {
    id: 'cs_test_1', label: '606-1',
    lines: [{ productId: 'p1', variantId: 1001, quantity: 2 }],
    recipient: { name: 'Pat Q Hunter', email: 'pat@example.com', phone: '555', address: { line1: '1 Main', line2: '', city: 'Hazard', state: 'KY', postalCode: '41701', country: 'US' } }
  }, fetcher);
  assert.deepEqual(result, { id: 'abc123' });
  assert.match(sent.url, /\/shops\/77\/orders\.json$/);
  assert.equal(sent.init.method, 'POST');
  assert.deepEqual(sent.body.line_items, [{ product_id: 'p1', variant_id: 1001, quantity: 2 }]);
  assert.equal(sent.body.external_id, 'cs_test_1');
  assert.equal(sent.body.shipping_method, 1);
  assert.equal(sent.body.send_shipping_notification, true);
  assert.deepEqual([sent.body.address_to.first_name, sent.body.address_to.last_name, sent.body.address_to.region, sent.body.address_to.zip], ['Pat', 'Q Hunter', 'KY', '41701']);
});

test('client errors are permanent, server errors and rate limits are retried', async () => {
  const env = { PRINTIFY_API_TOKEN: 't', PRINTIFY_SHOP_ID: '1' };
  const failing = status => async () => new Response('{"error":"nope"}', { status });
  await assert.rejects(sendToProduction(env, '9', failing(422)), error => error.permanent === true && error.status === 422);
  await assert.rejects(sendToProduction(env, '9', failing(500)), error => error.permanent === false);
  await assert.rejects(sendToProduction(env, '9', failing(429)), error => error.permanent === false);
});
