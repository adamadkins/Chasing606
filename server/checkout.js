// Turns a shopping bag into a Stripe Checkout Session, and reads the result back.
// Prices and availability always come from the server's own catalog, never the browser.

import { shippingConfig } from './config.js';

export const MAX_LINES = 10;
export const MAX_QUANTITY = 10;
// Stripe allows 500 characters per metadata value.
const MAX_CART_METADATA = 480;

export class CheckoutError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Check a bag against the catalog and price it.
 * @param items {{ productId: string, variantId: number, quantity: number }[]} from the browser
 * @param products the server's catalog
 */
export function priceBag(items, products) {
  if (!Array.isArray(items) || !items.length) throw new CheckoutError('Your bag is empty.');
  if (items.length > MAX_LINES) throw new CheckoutError(`Please check out with ${MAX_LINES} or fewer different items.`);

  const merged = new Map();
  for (const item of items) {
    const quantity = Number(item?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) throw new CheckoutError('An item quantity is invalid.');
    const key = `${item.productId}:${item.variantId}`;
    merged.set(key, { productId: String(item.productId), variantId: Number(item.variantId), quantity: Math.min(MAX_QUANTITY, (merged.get(key)?.quantity ?? 0) + quantity) });
  }

  const lines = [...merged.values()].map(item => {
    const product = products.find(candidate => candidate.id === item.productId);
    const variant = product?.variants.find(candidate => candidate.id === item.variantId);
    if (!product || !variant) throw new CheckoutError('An item in your bag is no longer sold. Please review your bag.', 409);
    if (!variant.available) throw new CheckoutError(`${product.name} (${variant.color}, ${variant.size}) is sold out.`, 409);
    const image = product.colors.find(color => color.name === variant.color)?.images[0] ?? product.colors[0]?.images[0] ?? null;
    return {
      productId: product.id,
      variantId: variant.id,
      quantity: item.quantity,
      unitCents: Math.round(variant.price * 100),
      name: product.name,
      description: [variant.color, variant.size].filter(value => value && value !== 'Standard' && value !== 'One size').join(' / '),
      image
    };
  });
  return { lines, subtotalCents: lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0) };
}

/** Flat rate, free above a threshold. Both come from configuration. */
export function shippingFor(subtotalCents, shipping) {
  const free = shipping.freeOverCents > 0 && subtotalCents >= shipping.freeOverCents;
  return free ? { cents: 0, label: 'Free shipping' } : { cents: shipping.flatCents, label: 'Standard shipping' };
}

/** `productId:variantId:quantity;…` — compact enough for Stripe metadata. */
export function encodeBag(lines) {
  const encoded = lines.map(line => `${line.productId}:${line.variantId}:${line.quantity}`).join(';');
  if (encoded.length > MAX_CART_METADATA) throw new CheckoutError('Your bag is too large to check out at once.');
  return encoded;
}

export function decodeBag(encoded) {
  const lines = String(encoded ?? '').split(';').filter(Boolean).map(part => {
    const [productId, variantId, quantity] = part.split(':');
    return { productId, variantId: Number(variantId), quantity: Number(quantity) };
  });
  if (!lines.length || lines.some(line => !line.productId || !Number.isInteger(line.variantId) || !Number.isInteger(line.quantity) || line.quantity < 1)) {
    throw new CheckoutError('The order contents could not be read.', 500);
  }
  return lines;
}

export async function startCheckout({ request, env, services, products }) {
  const origin = request.headers.get('Origin');
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin) throw new CheckoutError('Cross-site checkout is not allowed.', 403);
  if (!/^application\/json/i.test(request.headers.get('Content-Type') ?? '')) throw new CheckoutError('Send the bag as JSON.', 415);

  const body = await request.json().catch(() => null);
  const { lines, subtotalCents } = priceBag(body?.items, products);
  const shipping = shippingConfig(env);
  const session = await services.payments.createSession({
    lines,
    shipping: shippingFor(subtotalCents, shipping),
    countries: shipping.countries,
    returnUrl: `${requestOrigin}/order/complete?session_id={CHECKOUT_SESSION_ID}`,
    cart: encodeBag(lines),
    automaticTax: services.automaticTax
  });
  return { sessionId: session.id, clientSecret: session.clientSecret };
}

/** What the order-complete page may show: only whether it was paid, and where the receipt went. */
export async function orderStatus(sessionId, services) {
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(sessionId ?? '')) throw new CheckoutError('That order link is not valid.');
  let session;
  try {
    session = await services.payments.retrieveSession(sessionId);
  } catch (error) {
    // Stripe answers 404 for an id it does not know.
    if (error.status === 404) throw new CheckoutError('We could not find that order.', 404);
    throw error;
  }
  return { status: session.status, paid: session.paid, email: session.email };
}
