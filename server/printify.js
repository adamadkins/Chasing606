// Printify: the product catalog and the print-and-ship fulfillment.
// API reference: https://developers.printify.com/
//
// The product and order shapes below follow Printify's documentation. They have
// not yet been exercised against a live shop, so the first real test order is
// part of the launch checklist (see docs/CHECKOUT.md).

import { categoryFor } from './categories.js';

const API = 'https://api.printify.com/v1';
const PAGE_SIZE = 50;
const MAX_PAGES = 10;
const STANDARD_SHIPPING = 1;

export class PrintifyError extends Error {
  constructor(message, { status = 502, permanent = false } = {}) {
    super(message);
    this.status = status;
    // A permanent error will fail the same way again (bad address, product removed).
    this.permanent = permanent;
  }
}

async function request(env, path, { method = 'GET', body, fetcher = fetch } = {}) {
  const response = await fetcher(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.PRINTIFY_API_TOKEN}`,
      'Content-Type': 'application/json',
      // Printify rejects requests without a User-Agent.
      'User-Agent': 'Chasing606-Storefront/1.0'
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    const permanent = response.status >= 400 && response.status < 500 && response.status !== 429 && response.status !== 408;
    throw new PrintifyError(`Printify returned HTTP ${response.status} for ${method} ${path}: ${detail}`, { status: response.status, permanent });
  }
  return response.status === 204 ? null : response.json();
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

const toDollars = cents => Math.round(Number(cents)) / 100;

function imageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /(^|\.)printify\.com$/.test(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

const IMAGE_POSITIONS = ['front', 'back', 'left', 'right', 'person-front', 'person-back'];
const positionRank = position => {
  const index = IMAGE_POSITIONS.indexOf(position);
  return index === -1 ? IMAGE_POSITIONS.length : index;
};

/** Printify descriptions are small HTML snippets; the site shows plain text. */
export function htmlToText(html = '') {
  return String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h\d)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Convert one Printify product into the shape the website uses. Returns null if it cannot be sold. */
export function normalizePrintifyProduct(raw) {
  if (!raw?.id || raw.visible === false || !Array.isArray(raw.variants) || !Array.isArray(raw.options)) return null;

  const values = new Map();
  for (const option of raw.options) {
    for (const value of option.values ?? []) values.set(value.id, { type: option.type, title: String(value.title ?? '').trim(), hex: value.colors?.[0] });
  }

  const colorNames = [];
  const colorHex = new Map();
  const sizes = [];
  const variants = [];
  const colorVariantIds = new Map();

  for (const variant of raw.variants) {
    if (!variant.is_enabled) continue;
    const chosen = (variant.options ?? []).map(id => values.get(id)).filter(Boolean);
    const color = chosen.find(value => value.type === 'color')?.title || 'Standard';
    // Anything that is not a color (size, surface, scent…) becomes part of the size choice.
    const size = chosen.filter(value => value.type !== 'color').map(value => value.title).filter(Boolean).join(' / ') || 'One size';
    const price = toDollars(variant.price);
    if (!Number.isFinite(price) || price <= 0) continue;

    if (!colorNames.includes(color)) {
      colorNames.push(color);
      const hex = chosen.find(value => value.type === 'color')?.hex;
      colorHex.set(color, /^#[0-9a-f]{6}$/i.test(hex ?? '') ? hex.toLowerCase() : null);
    }
    if (!sizes.includes(size)) sizes.push(size);
    colorVariantIds.set(color, [...(colorVariantIds.get(color) ?? []), variant.id]);
    variants.push({ id: variant.id, color, size, price, available: variant.is_available !== false });
  }
  if (!variants.length) return null;

  const images = (raw.images ?? [])
    .map(image => ({ ...image, src: imageUrl(image.src) }))
    .filter(image => image.src)
    .sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)) || positionRank(a.position) - positionRank(b.position));
  const imagesFor = color => {
    const ids = new Set(colorVariantIds.get(color));
    const own = images.filter(image => (image.variant_ids ?? []).some(id => ids.has(id)));
    return [...new Set((own.length ? own : images).map(image => image.src))].slice(0, 8);
  };

  const purchasable = variants.filter(variant => variant.available);
  const priced = (purchasable.length ? purchasable : variants).map(variant => variant.price);
  const tags = Array.isArray(raw.tags) ? raw.tags.join(' ') : '';

  return {
    id: String(raw.id),
    name: String(raw.title ?? 'Chasing 606 gear').trim(),
    description: htmlToText(raw.description),
    type: '',
    category: categoryFor(raw.title, tags),
    currency: 'USD',
    price: Math.min(...priced),
    available: purchasable.length > 0,
    colors: colorNames.map(name => ({ name, hex: colorHex.get(name), images: imagesFor(name) })),
    sizes,
    variants
  };
}

export async function loadPrintifyCatalog(env, fetcher = fetch) {
  const products = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await request(env, `/shops/${env.PRINTIFY_SHOP_ID}/products.json?limit=${PAGE_SIZE}&page=${page}`, { fetcher });
    products.push(...(result.data ?? []).map(normalizePrintifyProduct).filter(Boolean));
    if (!result.data?.length || page >= (result.last_page ?? 1)) break;
  }
  return products;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/**
 * @param order {{ id: string, label: string, lines: {productId, variantId, quantity}[],
 *   recipient: { name, email, phone, address: {line1, line2, city, state, postalCode, country} } }}
 */
export async function createPrintifyOrder(env, order, fetcher = fetch) {
  const [first, ...rest] = order.recipient.name.trim().split(/\s+/);
  const { address } = order.recipient;
  const result = await request(env, `/shops/${env.PRINTIFY_SHOP_ID}/orders.json`, {
    method: 'POST',
    fetcher,
    body: {
      external_id: order.id,
      label: order.label,
      line_items: order.lines.map(line => ({ product_id: line.productId, variant_id: line.variantId, quantity: line.quantity })),
      shipping_method: STANDARD_SHIPPING,
      is_printify_express: false,
      // Printify emails the customer their tracking link.
      send_shipping_notification: true,
      address_to: {
        first_name: first || 'Customer',
        last_name: rest.join(' ') || '-',
        email: order.recipient.email,
        phone: order.recipient.phone || '',
        country: address.country,
        region: address.state || '',
        address1: address.line1,
        address2: address.line2 || '',
        city: address.city,
        zip: address.postalCode
      }
    }
  });
  if (!result?.id) throw new PrintifyError('Printify did not return an order id.');
  return { id: String(result.id) };
}

export async function sendToProduction(env, printifyOrderId, fetcher = fetch) {
  await request(env, `/shops/${env.PRINTIFY_SHOP_ID}/orders/${printifyOrderId}/send_to_production.json`, { method: 'POST', fetcher });
}

/** The fulfillment interface the checkout code talks to. */
export const printifyFulfiller = (env, fetcher = fetch) => ({
  createOrder: order => createPrintifyOrder(env, order, fetcher),
  submitOrder: id => sendToProduction(env, id, fetcher)
});
