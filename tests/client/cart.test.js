import test from 'node:test';
import assert from 'node:assert/strict';
import { addToBag, bagIsFull, lineKey, MAX_LINES, parseStoredBag, priceBag, removeFromBag, setQuantity, shippingQuote } from '../../src/lib/cart.js';

const products = [{
  id: 'p1', colors: [{ name: 'Black', images: ['img-black'] }, { name: 'Tan', images: [] }],
  variants: [
    { id: 1, color: 'Black', size: 'M', price: 40, available: true },
    { id: 2, color: 'Black', size: 'L', price: 40, available: false },
    { id: 3, color: 'Tan', size: 'M', price: 42.5, available: true }
  ]
}];

test('adding the same item twice raises its quantity, capped at 10', () => {
  let bag = addToBag([], 'p1', 1);
  bag = addToBag(bag, 'p1', 1);
  assert.deepEqual(bag, [{ productId: 'p1', variantId: 1, quantity: 2 }]);
  for (let i = 0; i < 20; i++) bag = addToBag(bag, 'p1', 1);
  assert.equal(bag[0].quantity, 10);
});

test('the bag holds at most ten different items', () => {
  let bag = [];
  for (let i = 0; i < MAX_LINES; i++) bag = addToBag(bag, 'p', i);
  assert.equal(bag.length, MAX_LINES);
  assert.equal(addToBag(bag, 'p', 99), bag, 'an eleventh line is refused');
  assert.equal(bagIsFull(bag, lineKey('p', 99)), true);
  assert.equal(bagIsFull(bag, lineKey('p', 3)), false, 'adding more of an existing line is fine');
});

test('quantity changes and removal', () => {
  const bag = [{ productId: 'p1', variantId: 1, quantity: 2 }, { productId: 'p1', variantId: 3, quantity: 1 }];
  assert.equal(setQuantity(bag, 'p1:1', 5)[0].quantity, 5);
  assert.equal(setQuantity(bag, 'p1:1', 50)[0].quantity, 10);
  assert.deepEqual(setQuantity(bag, 'p1:1', 0).map(item => item.variantId), [3]);
  assert.deepEqual(removeFromBag(bag, 'p1:3').map(item => item.variantId), [1]);
});

test('a saved bag is validated; garbage becomes an empty bag', () => {
  assert.deepEqual(parseStoredBag('[{"productId":"p1","variantId":1,"quantity":3}]'), [{ productId: 'p1', variantId: 1, quantity: 3 }]);
  assert.deepEqual(parseStoredBag('[{"productId":"p1","variantId":"1","quantity":3},{"variantId":1,"quantity":1},{"productId":"p","variantId":1,"quantity":0},{"productId":"p","variantId":2,"quantity":99}]'), [{ productId: 'p', variantId: 2, quantity: 10 }]);
  assert.deepEqual(parseStoredBag('not json'), []);
  assert.deepEqual(parseStoredBag('{"a":1}'), []);
  assert.deepEqual(parseStoredBag(null), []);
});

test('the bag is priced from the live catalog; sold-out lines stay visible but are not charged', () => {
  const result = priceBag([
    { productId: 'p1', variantId: 1, quantity: 2 },
    { productId: 'p1', variantId: 2, quantity: 1 },
    { productId: 'p1', variantId: 3, quantity: 1 },
    { productId: 'gone', variantId: 9, quantity: 1 }
  ], products);
  assert.equal(result.lines.length, 3, 'removed products disappear');
  assert.equal(result.subtotal, 2 * 40 + 42.5);
  assert.equal(result.count, 3);
  assert.equal(result.hasUnavailable, true);
  assert.equal(result.lines[1].unavailable, true);
  assert.equal(result.lines[0].image, 'img-black');
  assert.equal(result.lines[2].image, 'img-black', 'falls back to any photo the product has');
});

test('shipping: flat rate, free at the threshold, and how far away free shipping is', () => {
  const shipping = { flatCents: 599, freeOverCents: 7500 };
  assert.deepEqual(shippingQuote(40, shipping), { amount: 5.99, free: false, remaining: 35 });
  assert.deepEqual(shippingQuote(75, shipping), { amount: 0, free: true, remaining: 0 });
  assert.deepEqual(shippingQuote(0, shipping), { amount: 0, free: false, remaining: 0 });
  assert.equal(shippingQuote(10, { flatCents: 599, freeOverCents: 0 }).remaining, 0);
});
