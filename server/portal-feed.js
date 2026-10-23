// Products come from the client's connected Printful store through the TLT Studios
// portal. The portal holds the Printful token; this Worker only holds a read-only
// site key (PORTAL_FEED_KEY) and never talks to Printful itself.
const DEFAULT_FEED = 'https://portal.tlt-studios.com/api/site/printful/products';

class PortalFeedError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

export const portalFeedEnabled = env => Boolean(env?.PORTAL_FEED_KEY);

const categoryFor = name => {
  if (/hoodie|sweatshirt|crewneck/i.test(name)) return 'Hoodies & Sweatshirts';
  if (/tee|shirt/i.test(name)) return 'T-Shirts';
  if (/sticker|decal/i.test(name)) return 'Stickers';
  if (/tumbler|mug|bottle/i.test(name)) return 'Drinkware';
  if (/hat|cap|beanie/i.test(name)) return 'Hats';
  return 'Accessories';
};

const httpsImage = value => (typeof value === 'string' && /^https:\/\//.test(value) ? value : null);

export function normalizePortalProduct(product) {
  if (!product?.id || !Array.isArray(product.variants) || !product.variants.length) return null;
  const colors = [];
  const sizes = [];
  const galleryByColor = {};
  const variants = product.variants.map(v => {
    const color = v.color || 'Standard';
    const size = v.size || 'One size';
    if (!colors.includes(color)) colors.push(color);
    if (!sizes.includes(size)) sizes.push(size);
    const image = httpsImage(v.image);
    if (image) galleryByColor[color] = [...new Set([...(galleryByColor[color] || []), image])];
    return {
      id: String(v.id), label: `${color} / ${size}`, color, size,
      price: v.price_cents / 100, currencyCode: v.currency || 'USD',
      available: v.available !== false, image, images: image ? [image] : []
    };
  });
  const imagesByColor = Object.fromEntries(Object.entries(galleryByColor).map(([color, images]) => [color, images[0]]));
  const thumbnail = httpsImage(product.thumbnail);
  const category = categoryFor(product.name);
  return {
    id: String(product.id), name: product.name, slug: String(product.id), description: '',
    category, collections: [category],
    color: colors.join(', '), colors, sizes,
    image: thumbnail || imagesByColor[colors[0]] || null,
    imagesByColor, galleryByColor,
    images: [...new Set([thumbnail, ...Object.values(galleryByColor).flat()].filter(Boolean))],
    imageAlt: product.name,
    price: product.price_cents / 100, currencyCode: product.currency || 'USD',
    available: product.available !== false && variants.some(v => v.available),
    variants, shopUrl: null, provider: 'printful'
  };
}

export async function portalProducts(env, fetcher = fetch) {
  let response;
  try {
    response = await fetcher(env.PORTAL_FEED_URL || DEFAULT_FEED, {
      headers: { Authorization: `Bearer ${env.PORTAL_FEED_KEY}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(20000)
    });
  } catch { throw new PortalFeedError('The shop is temporarily unavailable.'); }
  if (!response.ok) throw new PortalFeedError('The shop is temporarily unavailable.');
  const data = await response.json().catch(() => null);
  if (!Array.isArray(data?.products)) throw new PortalFeedError('The shop returned an unexpected response.');
  const products = data.products.map(normalizePortalProduct).filter(Boolean);
  return { mode: 'printful', collections: [...new Set(products.flatMap(product => product.collections))], products };
}

export async function handlePortalCommerce(request, env, fetcher = fetch) {
  const path = new URL(request.url).pathname;
  const headers = { 'Cache-Control': path === '/api/products' ? 'public, max-age=300' : 'no-store' };
  if (path === '/api/commerce' && request.method === 'GET') {
    return Response.json({ mode: 'printful', checkoutEnabled: false, accountUrl: null, shopUrl: null }, { headers });
  }
  if (path === '/api/products' && request.method === 'GET') {
    try { return Response.json(await portalProducts(env, fetcher), { headers }); }
    catch (error) {
      return Response.json({ error: error instanceof PortalFeedError ? error.message : 'The shop is temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
  }
  if (path === '/api/checkout') return Response.json({ error: 'Checkout is not open yet.' }, { status: 409, headers });
  return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...headers, Allow: 'GET' } });
}
