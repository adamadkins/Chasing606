// The shopping bag: pure functions over `[{ productId, variantId, quantity }]`.
// Prices are never stored; they are looked up in the live catalog each time.

export const MAX_LINES = 10;
export const MAX_QUANTITY = 10;

export const lineKey = (productId, variantId) => `${productId}:${variantId}`;

const sameLine = (item, key) => lineKey(item.productId, item.variantId) === key;

export const bagIsFull = (items, key) => items.length >= MAX_LINES && !items.some(item => sameLine(item, key));

export function addToBag(items, productId, variantId, quantity = 1) {
  const key = lineKey(productId, variantId);
  if (bagIsFull(items, key)) return items;
  const existing = items.find(item => sameLine(item, key));
  if (!existing) return [...items, { productId, variantId, quantity: Math.min(quantity, MAX_QUANTITY) }];
  return items.map(item => (item === existing ? { ...item, quantity: Math.min(item.quantity + quantity, MAX_QUANTITY) } : item));
}

export function setQuantity(items, key, quantity) {
  if (quantity <= 0) return items.filter(item => !sameLine(item, key));
  return items.map(item => (sameLine(item, key) ? { ...item, quantity: Math.min(quantity, MAX_QUANTITY) } : item));
}

export const removeFromBag = (items, key) => items.filter(item => !sameLine(item, key));

/** Reads a saved bag, ignoring anything malformed (it came from storage we do not control). */
export function parseStoredBag(raw) {
  try {
    const value = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return value
      .filter(item => typeof item?.productId === 'string' && Number.isInteger(item.variantId) && Number.isInteger(item.quantity) && item.quantity > 0)
      .slice(0, MAX_LINES)
      .map(item => ({ productId: item.productId, variantId: item.variantId, quantity: Math.min(item.quantity, MAX_QUANTITY) }));
  } catch {
    return [];
  }
}

/**
 * Join the bag with the catalog. Lines whose product has been removed are dropped;
 * lines that are sold out stay (so the shopper can see why) but are not counted in the total.
 */
export function priceBag(items, products) {
  const lines = [];
  for (const item of items) {
    const product = products.find(candidate => candidate.id === item.productId);
    const variant = product?.variants.find(candidate => candidate.id === item.variantId);
    if (!product || !variant) continue;
    const color = product.colors.find(candidate => candidate.name === variant.color);
    lines.push({
      key: lineKey(product.id, variant.id),
      product, variant,
      quantity: item.quantity,
      unitPrice: variant.price,
      image: color?.images[0] ?? product.colors.find(candidate => candidate.images.length)?.images[0] ?? null,
      unavailable: !variant.available
    });
  }
  const buying = lines.filter(line => !line.unavailable);
  return {
    lines,
    count: buying.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: buying.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    hasUnavailable: lines.some(line => line.unavailable)
  };
}

/** Flat rate, free once the subtotal reaches the threshold. `shipping` is in cents, as the server sends it. */
export function shippingQuote(subtotal, shipping) {
  if (!subtotal) return { amount: 0, free: false, remaining: 0 };
  const flat = shipping.flatCents / 100;
  const threshold = shipping.freeOverCents / 100;
  const free = threshold > 0 && subtotal >= threshold;
  return { amount: free ? 0 : flat, free, remaining: threshold > 0 && !free ? threshold - subtotal : 0 };
}
