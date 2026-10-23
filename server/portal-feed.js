// Products come from the client's connected Printful store through the TLT Studios
// portal. The portal holds the Printful and Stripe connections; this Worker holds no secret. It names its
// own address (X-Site-Origin) and the portal looks up whose shop that is. It never talks to Printful itself.
const DEFAULT_FEED = 'https://portal.tlt-studios.com/api/site/printful/products';

class PortalFeedError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

// Switched on by PORTAL_SHOP=true in wrangler.jsonc, so no secret has to be set in Cloudflare.
export const portalFeedEnabled = env => env?.PORTAL_SHOP === 'true';

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
    // Every picture Printful has for this variant, so pictures added or removed there follow along.
    const pictures = [...new Set([...(Array.isArray(v.images) ? v.images : []), v.image].map(httpsImage).filter(Boolean))];
    if (pictures.length) galleryByColor[color] = [...new Set([...(galleryByColor[color] || []), ...pictures])];
    return {
      id: String(v.id), label: `${color} / ${size}`, color, size,
      price: v.price_cents / 100, currencyCode: v.currency || 'USD',
      available: v.available !== false, image, images: pictures
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

export async function portalProducts(env, origin, fetcher = fetch) {
  let response;
  try {
    response = await fetcher(env.PORTAL_FEED_URL || DEFAULT_FEED, {
      headers: { 'X-Site-Origin': origin, Accept: 'application/json' },
      signal: AbortSignal.timeout(20000)
    });
  } catch { throw new PortalFeedError('The shop is temporarily unavailable.'); }
  if (!response.ok) throw new PortalFeedError('The shop is temporarily unavailable.');
  const data = await response.json().catch(() => null);
  if (!Array.isArray(data?.products)) throw new PortalFeedError('The shop returned an unexpected response.');
  const products = data.products.map(normalizePortalProduct).filter(Boolean);
  return { mode: 'printful', collections: [...new Set(products.flatMap(product => product.collections))], products };
}

const CHECKOUT_FEED = 'https://portal.tlt-studios.com/api/site/printful/checkout';

// The browser names variants and quantities only; the portal prices them from Printful and opens Stripe Checkout.
export async function handleCheckout(request, env, fetcher = fetch) {
  const headers = { 'Cache-Control': 'no-store' };
  const fail = (error, status) => Response.json({ error }, { status, headers });
  let input;
  try { input = await request.json(); } catch { return fail('Please review your bag and try again.', 400); }
  const lines = Array.isArray(input?.lines) ? input.lines : [];
  if (!lines.length || lines.length > 20 || lines.some(line => typeof line?.merchandiseId !== 'string' || !/^\d{1,20}$/.test(line.merchandiseId) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10)) {
    return fail('An item or quantity is invalid. Please review your bag.', 400);
  }
  const origin = new URL(request.url).origin;
  let response;
  try {
    response = await fetcher(env.PORTAL_CHECKOUT_URL || CHECKOUT_FEED, {
      method: 'POST',
      headers: { 'X-Site-Origin': origin, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ lines: lines.map(line => ({ variant_id: line.merchandiseId, quantity: line.quantity })), success_url: `${origin}/merch?order=success`, cancel_url: `${origin}/merch` }),
      signal: AbortSignal.timeout(25000)
    });
  } catch { return fail('Checkout is temporarily unavailable.', 502); }
  const data = await response.json().catch(() => null);
  // Only a portal message about the cart itself (400/409) is shown; anything else stays generic.
  if (!response.ok) return fail([400, 409].includes(response.status) && typeof data?.error === 'string' ? data.error : 'Checkout is temporarily unavailable.', [400, 409].includes(response.status) ? response.status : 502);
  if (typeof data?.url !== 'string' || !/^https:\/\/checkout\.stripe\.com\//.test(data.url)) return fail('Checkout is temporarily unavailable.', 502);
  return Response.json({ checkoutUrl: data.url }, { headers });
}

export async function handlePortalCommerce(request, env, fetcher = fetch) {
  const path = new URL(request.url).pathname;
  const headers = { 'Cache-Control': path === '/api/products' ? 'public, max-age=300' : 'no-store' };
  if (path === '/api/commerce' && request.method === 'GET') {
    return Response.json({ mode: 'printful', checkoutEnabled: true, accountUrl: null, shopUrl: null }, { headers });
  }
  if (path === '/api/products' && request.method === 'GET') {
    try { return Response.json(await portalProducts(env, new URL(request.url).origin, fetcher), { headers }); }
    catch (error) {
      return Response.json({ error: error instanceof PortalFeedError ? error.message : 'The shop is temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
  }
  if (path === '/api/checkout' && request.method === 'POST') return handleCheckout(request, env, fetcher);
  if (path === '/api/checkout') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...headers, Allow: 'POST' } });
  return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...headers, Allow: 'GET' } });
}
