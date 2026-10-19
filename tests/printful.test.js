import test from 'node:test';
import assert from 'node:assert/strict';
import { galleriesFromMockups, mockupRequestFor, printfulStorefrontPreview } from '../server/printful.js';

const variant = (id, color, size = 'M') => ({
  id: id + 1000,
  variant_id: id,
  name: `Oversized tee / ${color} / ${size}`,
  color,
  size,
  synced: true,
  retail_price: '29.00',
  currency: 'USD',
  product: { product_id: 823, image: `https://example.com/${color}.jpg` },
  files: [
    { type: 'default', url: 'https://example.com/art.png', hash: 'art-v1' },
    { type: 'preview', url: 'https://example.com/raw-preview.png' }
  ]
});

const source = {
  sync_product: { id: 55, name: 'Oversized tee', thumbnail_url: 'https://example.com/thumb.jpg' },
  sync_variants: [variant(101, 'Navy'), variant(102, 'Navy', 'L'), variant(201, 'White')]
};

test('mockup request uses one variant per color and requests flat/lifestyle front/back views', () => {
  const request = mockupRequestFor(source, {
    option_groups: ['Flat', "Men's Lifestyle", 'On Hanger'],
    options: ['Front', 'Back', 'Detail']
  });
  assert.equal(request.productId, 823);
  assert.deepEqual(request.body.variant_ids, [101, 201]);
  assert.deepEqual(request.body.option_groups, ['Flat', "Men's Lifestyle"]);
  assert.deepEqual(request.body.options, ['Front', 'Back']);
  assert.deepEqual(request.body.files, [{ placement: 'front', image_url: 'https://example.com/art.png' }]);
  assert.deepEqual(request.colorVariants, { Navy: 101, White: 201 });
});

test('mockup request accepts Printful embroidery preview files and normalizes their placement', () => {
  const embroiderySource = structuredClone(source);
  embroiderySource.sync_variants[0].files = [{
    type: 'embroidery_front',
    preview_url: 'https://example.com/embroidery-preview.png',
    options: [{ id: 'full_color', value: true }]
  }];
  embroiderySource.sync_variants[0].options = [{ id: 'embroidery_type', value: 'flat' }];
  const request = mockupRequestFor(embroiderySource, { available_placements: { embroidery_front: 'Front' } });
  assert.deepEqual(request.body.files, [{
    placement: 'embroidery_front',
    image_url: 'https://example.com/embroidery-preview.png',
    options: [{ id: 'full_color', value: true }]
  }]);
  assert.deepEqual(request.body.product_options, { embroidery_type: 'flat' });
  const defaultFileRequest = mockupRequestFor(source, {
    available_placements: { embroidery_front: 'Front' },
    variant_printfiles: [{ variant_id: 101, placements: { embroidery_front: 9 } }],
    printfiles: [{ printfile_id: 9, width: 1800, height: 1200 }]
  });
  assert.equal(defaultFileRequest.body.files[0].placement, 'embroidery_front');
  assert.deepEqual(defaultFileRequest.body.files[0].position, {
    area_width: 1800, area_height: 1200, width: 1800, height: 1200, left: 0, top: 0
  });
});

test('generated galleries order product front/back before model front/back for each color', () => {
  const mockups = [{
    placement: 'front', display_name: 'Front print', variant_ids: [101], mockup_url: 'https://example.com/product-front.jpg',
    extra: [
      { title: 'Back', option: 'Back', option_group: 'Flat', url: 'https://example.com/product-back.jpg' },
      { title: 'Front', option: 'Front', option_group: "Men's Lifestyle", url: 'https://example.com/model-front.jpg' },
      { title: 'Back', option: 'Back', option_group: "Men's Lifestyle", url: 'https://example.com/model-back.jpg' }
    ]
  }];
  assert.deepEqual(galleriesFromMockups(mockups, { Navy: 101 }).Navy, [
    'https://example.com/product-front.jpg',
    'https://example.com/product-back.jpg',
    'https://example.com/model-front.jpg',
    'https://example.com/model-back.jpg'
  ]);
});

test('storefront preview discovers the product in the token-selected store and starts one mockup task', async () => {
  const calls = [];
  const fetcher = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('sync/products?')) return Response.json({ code: 200, result: [{ id: 55 }] });
    if (String(url).endsWith('/sync/products/55')) return Response.json({ code: 200, result: source });
    if (String(url).includes('/printfiles/823')) return Response.json({ code: 200, result: { option_groups: ['Flat', "Men's Lifestyle"], options: ['Front', 'Back'] } });
    if (String(url).includes('/create-task/823')) return Response.json({ code: 200, result: { status: 'pending', task_key: 'task-1' } });
    throw new Error(`Unexpected request: ${url}`);
  };
  const response = await printfulStorefrontPreview(
    new Request('https://site.test/api/printful/storefront-preview'),
    { PRINTFUL_API_TOKEN: 'test-token' },
    fetcher,
    null
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.product.id, '55');
  assert.equal(body.mockupStatus, 'pending');
  assert.equal(calls.filter(call => call.url.includes('/create-task/')).length, 1);
  const create = calls.find(call => call.url.includes('/create-task/'));
  assert.equal(create.options.method, 'POST');
  assert(!JSON.stringify(body).includes('test-token'));
});
