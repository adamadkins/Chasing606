// Reads the public Chasing 606 Spring storefront and turns it into a small,
// browser-friendly catalog. Spring has no public API, so the product list is
// extracted from the Next.js payload embedded in the storefront's HTML.

import { categoryFor } from './categories.js';

export const SPRING_STORE_URL = 'https://chasing606.creator-spring.com';

const MAX_HTML_BYTES = 3_000_000;
const IMAGE_HOST = 'mockup-api.teespring.com';

export class SpringError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Parsing the storefront page
// ---------------------------------------------------------------------------

// Next.js streams page data as `self.__next_f.push([1, "<json string>"])` calls.
function flightChunks(html) {
  const chunks = [];
  const pattern = /self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)<\/script>/g;
  for (const match of html.matchAll(pattern)) {
    try {
      chunks.push(JSON.parse(match[1]));
    } catch {
      // Skip chunks that are not standalone JSON strings.
    }
  }
  return chunks;
}

function findProductList(value) {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProductList(item);
      if (found) return found;
    }
    return null;
  }
  if (Array.isArray(value.products) && value.products.some(product => Array.isArray(product?.primaryProduct))) {
    return value.products;
  }
  for (const item of Object.values(value)) {
    const found = findProductList(item);
    if (found) return found;
  }
  return null;
}

export function parseSpringCatalog(html) {
  for (const chunk of flightChunks(html)) {
    if (!chunk.includes('primaryProduct')) continue;
    const colon = chunk.indexOf(':');
    if (colon < 0) continue;
    try {
      const products = findProductList(JSON.parse(chunk.slice(colon + 1)));
      if (products) return products;
    } catch {
      // Not the chunk we want; keep looking.
    }
  }
  throw new SpringError('The Spring catalog format changed.');
}

// ---------------------------------------------------------------------------
// Normalizing products
// ---------------------------------------------------------------------------

function safeImageUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.startsWith('//') ? `https:${value}` : value);
    return url.protocol === 'https:' && url.hostname === IMAGE_HOST ? url.href : null;
  } catch {
    return null;
  }
}

// Spring sends hex values such as "#ffffff" or "#C0C0C000" (with alpha).
function swatchHex(value) {
  const match = /^#?([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(String(value ?? '').trim());
  return match ? `#${match[1].toLowerCase()}` : null;
}

const toPrice = value => {
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
};

function colorwayVariants(colorway, fallbackCurrency) {
  const color = String(colorway.color || 'Standard').trim();
  const sizes = Array.isArray(colorway.sizes) && colorway.sizes.length ? colorway.sizes : colorway.availableSizes;
  const currency = colorway.currency || fallbackCurrency;

  if (!Array.isArray(sizes) || !sizes.length) {
    return [{ color, size: 'One size', price: toPrice(colorway.price), currency, available: Number(colorway.inventoryCount) !== 0 }];
  }

  // `availableSizes` lists what can be ordered today; `sizes` lists everything.
  const inStock = Array.isArray(colorway.availableSizes)
    ? new Set(colorway.availableSizes.map(size => size.id))
    : null;

  return sizes
    .map(size => ({
      color,
      size: String(size.label || '').trim(),
      price: toPrice(size.price ?? colorway.price),
      currency,
      available: inStock ? inStock.has(size.id) : Number(colorway.inventoryCount) !== 0
    }))
    .filter(variant => variant.size);
}

/**
 * Convert one raw Spring listing into the shape the website uses.
 * Returns null for listings that are malformed or point somewhere unexpected.
 */
export function normalizeSpringProduct(product) {
  const listingId = Number(product?.listingId);
  const productId = Number(product?.primaryProductId);
  const slug = typeof product?.url === 'string' && /^[a-z0-9-]+$/i.test(product.url) ? product.url : null;
  if (!listingId || !productId || !slug || !Array.isArray(product.primaryProduct) || !product.primaryProduct.length) return null;

  const currency = product.currency || 'USD';
  const colors = [];
  const variants = [];

  for (const colorway of product.primaryProduct) {
    const name = String(colorway.color || 'Standard').trim();
    if (colors.some(color => color.name === name)) continue;
    const images = (colorway.images || []).map(image => safeImageUrl(image.full || image.src)).filter(Boolean);
    colors.push({ name, hex: swatchHex(colorway.attributes?.hex), images: [...new Set(images)] });
    variants.push(...colorwayVariants(colorway, currency));
  }

  const sizes = [...new Set(variants.map(variant => variant.size))];
  const purchasable = variants.filter(variant => variant.available);
  // Sold-out items still show what they cost.
  const priced = (purchasable.length ? purchasable : variants).map(variant => variant.price).filter(price => price !== null);
  const first = product.primaryProduct[0];

  return {
    id: `${listingId}-${productId}`,
    name: String(product.title || 'Chasing 606 gear').trim(),
    description: String(product.description || '').trim(),
    type: String(first.productType || '').trim(),
    category: categoryFor(product.primaryProductType, first.productType),
    currency,
    price: priced.length ? Math.min(...priced) : 0,
    available: purchasable.length > 0,
    shopUrl: `${SPRING_STORE_URL}/listing/${slug}?product=${productId}`,
    colors,
    sizes,
    variants: variants.map(({ color, size, price, available }) => ({ color, size, price: price ?? 0, available }))
  };
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

export async function loadSpringCatalog(fetcher = fetch) {
  const response = await fetcher(`${SPRING_STORE_URL}/`, {
    headers: { Accept: 'text/html', 'User-Agent': 'Chasing606-Storefront/1.0' },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new SpringError('The Spring shop is temporarily unavailable.');

  const html = await response.text();
  if (html.length > MAX_HTML_BYTES) throw new SpringError('The Spring catalog response is too large.');

  const normalized = parseSpringCatalog(html).map(normalizeSpringProduct).filter(Boolean);
  const products = [...new Map(normalized.map(product => [product.id, product])).values()];
  if (!products.length) throw new SpringError('The Spring collection is empty.');

  return { shopUrl: SPRING_STORE_URL, products };
}
