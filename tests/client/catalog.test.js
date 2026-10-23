import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeFilterCount, allSizes, colorImages, coverImage, DEFAULT_QUERY, defaultSelection, findVariant, imageAtSize, isSizeAvailable, queryProducts
} from '../../src/lib/catalog.js';
import { formatMoney } from '../../src/lib/format.js';

const product = (overrides = {}) => ({
  id: 'p', name: 'Classic Hoodie', type: 'Pullover Hoodie', category: 'Hoodies & Sweatshirts', currency: 'USD', price: 30, available: true,
  colors: [{ name: 'White', hex: '#fff', images: ['w1', 'w2'] }, { name: 'Black', hex: '#000', images: [] }],
  sizes: ['S', 'M'],
  variants: [
    { color: 'White', size: 'S', price: 30, available: false },
    { color: 'White', size: 'M', price: 30, available: true },
    { color: 'Black', size: 'S', price: 30, available: true },
    { color: 'Black', size: 'M', price: 32, available: false }
  ],
  ...overrides
});

const tee = product({ id: 't', name: 'Duck Camo Tee', type: 'Tee', category: 'T-Shirts', price: 20, colors: [{ name: 'Standard', hex: null, images: ['t1'] }], sizes: ['M'], variants: [{ color: 'Standard', size: 'M', price: 20, available: false }], available: false });
const sticker = product({ id: 's', name: 'Sticker', type: 'Die Cut Sticker', category: 'Stickers', price: 7, colors: [{ name: 'Standard', hex: null, images: [] }], sizes: ['One size'], variants: [{ color: 'Standard', size: 'One size', price: 7, available: true }] });
const all = [tee, product(), sticker];

test('variant lookup is exact: "S" never matches "XS"', () => {
  const p = product({ sizes: ['XS', 'S'], variants: [{ color: 'White', size: 'XS', price: 1, available: true }] });
  assert.equal(findVariant(p, 'White', 'S'), null);
  assert.equal(findVariant(p, 'White', 'XS').price, 1);
});

test('default selection prefers a color and size that can actually be ordered', () => {
  assert.deepEqual(defaultSelection(product()), { color: 'White', size: 'M' });
  assert.deepEqual(defaultSelection(tee), { color: 'Standard', size: 'M' });
  const blackOnly = product({ variants: [{ color: 'Black', size: 'S', price: 30, available: true }] });
  assert.deepEqual(defaultSelection(blackOnly), { color: 'Black', size: 'S' });
});

test('size availability is per color', () => {
  const p = product();
  assert.equal(isSizeAvailable(p, 'White', 'S'), false);
  assert.equal(isSizeAvailable(p, 'Black', 'S'), true);
  assert.equal(isSizeAvailable(p, 'Black', 'XL'), false);
});

test('cover image falls back to any photo the product has', () => {
  const p = product();
  assert.equal(coverImage(p, 'White'), 'w1');
  assert.equal(coverImage(p, 'Black'), 'w1');
  assert.deepEqual(colorImages(p, 'Black'), []);
  assert.equal(coverImage(sticker, 'Standard'), null);
});

test('sizes are listed smallest first, unknown sizes last', () => {
  assert.deepEqual(allSizes([{ sizes: ['XL', 'S', 'Custom'] }, { sizes: ['M', '2XL', 'XS'] }]), ['XS', 'S', 'M', 'XL', '2XL', 'Custom']);
});

test('featured order puts orderable products before sold-out ones', () => {
  assert.deepEqual(queryProducts(all, DEFAULT_QUERY).map(p => p.id), ['p', 's', 't']);
});

test('filters combine: category, color, size, stock, price, search', () => {
  const ids = query => queryProducts(all, { ...DEFAULT_QUERY, ...query }).map(p => p.id);
  assert.deepEqual(ids({ category: 'Stickers' }), ['s']);
  assert.deepEqual(ids({ color: 'Black' }), ['p']);
  assert.deepEqual(ids({ size: 'M' }), ['p', 't']);
  assert.deepEqual(ids({ stockOnly: true }), ['p', 's']);
  // In stock "in Black, size M" is sold out, so the hoodie drops out.
  assert.deepEqual(ids({ stockOnly: true, color: 'Black', size: 'M' }), []);
  assert.deepEqual(ids({ maxPrice: '25' }), ['s', 't']);
  assert.deepEqual(ids({ search: '  CAMO ' }), ['t']);
  assert.deepEqual(ids({ search: 'pullover' }), ['p']);
});

test('sorting by price does not mutate the catalog', () => {
  const copy = [...all];
  assert.deepEqual(queryProducts(all, { ...DEFAULT_QUERY, sort: 'low' }).map(p => p.id), ['s', 't', 'p']);
  assert.deepEqual(queryProducts(all, { ...DEFAULT_QUERY, sort: 'high' }).map(p => p.id), ['p', 't', 's']);
  assert.deepEqual(all, copy);
});

test('active filter count ignores search and sort', () => {
  assert.equal(activeFilterCount(DEFAULT_QUERY), 0);
  assert.equal(activeFilterCount({ ...DEFAULT_QUERY, search: 'x', sort: 'low', color: 'White', stockOnly: true }), 2);
});

test('money is formatted as US dollars', () => {
  assert.equal(formatMoney(29.99), '$29.99');
  assert.equal(formatMoney(50), '$50.00');
});

test('mockup image URLs can be requested at a smaller size', () => {
  assert.equal(imageAtSize('https://mockup-api.teespring.com/v3/image/abc/1200/1200.jpg', 600), 'https://mockup-api.teespring.com/v3/image/abc/600/600.jpg');
  assert.equal(imageAtSize('https://example.com/other.png', 600), 'https://example.com/other.png');
});
