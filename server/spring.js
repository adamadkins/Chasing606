const STORE = 'https://chasing606.creator-spring.com';

class SpringError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

function flightParts(html) {
  const parts = [];
  const pattern = /self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)<\/script>/g;
  let match;
  while ((match = pattern.exec(html))) {
    try { parts.push(JSON.parse(match[1])); } catch {}
  }
  return parts;
}

function findProductPayload(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProductPayload(item);
      if (found) return found;
    }
  } else if (typeof value === 'object') {
    if (Array.isArray(value.products) && value.products.some(product => Array.isArray(product?.primaryProduct))) return value;
    for (const item of Object.values(value)) {
      const found = findProductPayload(item);
      if (found) return found;
    }
  }
  return null;
}

export function parseSpringCatalog(html) {
  for (const part of flightParts(html)) {
    if (!part.includes('primaryProduct')) continue;
    const colon = part.indexOf(':');
    if (colon < 0) continue;
    try {
      const payload = findProductPayload(JSON.parse(part.slice(colon + 1)));
      if (payload) return payload.products;
    } catch {}
  }
  throw new SpringError('The Spring catalog format changed.', 502);
}

const imageUrl = value => {
  if (typeof value !== 'string') return null;
  const url = value.startsWith('//') ? `https:${value}` : value;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'mockup-api.teespring.com' ? parsed.href : null;
  } catch { return null; }
};

const categoryFor = type => {
  if (/hoodie|sweatshirt/i.test(type)) return 'Hoodies & Sweatshirts';
  if (/tee|shirt/i.test(type)) return 'T-Shirts';
  if (/sticker/i.test(type)) return 'Stickers';
  if (/tumbler|mug|drink/i.test(type)) return 'Drinkware';
  return 'Accessories';
};

export function normalizeSpringProduct(product) {
  const listingId = Number(product?.listingId);
  const productId = Number(product?.primaryProductId);
  const slug = typeof product?.url === 'string' && /^[a-z0-9-]+$/i.test(product.url) ? product.url : null;
  if (!listingId || !productId || !slug || !Array.isArray(product.primaryProduct)) return null;
  const shopUrl = `${STORE}/listing/${slug}?product=${productId}`;
  const colors = [];
  const sizes = [];
  const variants = [];
  const imagesByColor = {};
  const galleryByColor = {};
  for (const colorway of product.primaryProduct) {
    const color = String(colorway.color || 'Standard').trim();
    if (!colors.includes(color)) colors.push(color);
    const images = [...new Set((colorway.images || []).map(image => imageUrl(image.full || image.src)).filter(Boolean))];
    if (images[0]) imagesByColor[color] = images[0];
    galleryByColor[color] = images;
    const availableSizes = Array.isArray(colorway.availableSizes) ? colorway.availableSizes : [];
    const choices = availableSizes.length ? availableSizes : (Array.isArray(colorway.sizes) && colorway.sizes.length === 1 ? colorway.sizes : []);
    if (choices.length) {
      for (const choice of choices) {
        const size = String(choice.label || '').trim();
        if (!size) continue;
        if (!sizes.includes(size)) sizes.push(size);
        const price = Number(choice.price ?? colorway.price);
        variants.push({
          id: `${listingId}:${productId}:${colorway.variationId || 0}:${choice.id || size}`,
          label: `${color} / ${size}`, color, size,
          price: Number.isFinite(price) ? price : 0,
          currencyCode: colorway.currency || product.currency || 'USD',
          available: true, image: images[0] || null, images, shopUrl
        });
      }
    } else {
      const size = 'One size';
      if (!sizes.includes(size)) sizes.push(size);
      const price = Number(colorway.price);
      variants.push({
        id: `${listingId}:${productId}:${colorway.variationId || 0}`,
        label: color, color, size,
        price: Number.isFinite(price) ? price : 0,
        currencyCode: colorway.currency || product.currency || 'USD',
        available: Number(colorway.inventoryCount) !== 0,
        image: images[0] || null, images, shopUrl
      });
    }
  }
  const availableVariants = variants.filter(variant => variant.available);
  const price = Math.min(...availableVariants.map(variant => variant.price).filter(value => value > 0));
  const category = categoryFor(product.primaryProductType || product.primaryProduct[0]?.productType || '');
  return {
    id: `${listingId}-${productId}`,
    name: String(product.title || 'Chasing 606 gear'),
    slug,
    description: String(product.description || '').trim(),
    category,
    collections: [category],
    color: colors.join(', '), colors, sizes,
    image: imagesByColor[colors[0]] || null,
    imagesByColor,
    galleryByColor,
    images: [...new Set(Object.values(galleryByColor).flat())],
    imageAlt: String(product.title || 'Chasing 606 gear'),
    price: Number.isFinite(price) ? price : 0,
    currencyCode: product.currency || 'USD',
    available: availableVariants.length > 0,
    variants,
    shopUrl,
    provider: 'spring'
  };
}

export async function springProducts(fetcher = fetch) {
  const response = await fetcher(`${STORE}/`, {
    headers: { Accept: 'text/html', 'User-Agent': 'Chasing606-Storefront/1.0' },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new SpringError('The Spring shop is temporarily unavailable.', 502);
  const html = await response.text();
  if (html.length > 3_000_000) throw new SpringError('The Spring catalog response is too large.', 502);
  const normalized = parseSpringCatalog(html).map(normalizeSpringProduct).filter(Boolean);
  const products = [...new Map(normalized.map(product => [product.id, product])).values()];
  if (!products.length) throw new SpringError('The Spring collection is empty.', 502);
  return { mode: 'spring', collections: [...new Set(products.flatMap(product => product.collections))], products };
}

export async function handleSpringCommerce(request, fetcher = fetch) {
  const path = new URL(request.url).pathname;
  const headers = { 'Cache-Control': path === '/api/products' ? 'public, max-age=300' : 'no-store' };
  try {
    if (path === '/api/commerce' && request.method === 'GET') {
      return Response.json({ mode: 'spring', checkoutEnabled: false, accountUrl: null, shopUrl: STORE }, { headers });
    }
    if (path === '/api/products' && request.method === 'GET') return Response.json(await springProducts(fetcher), { headers });
    if (path === '/api/checkout') {
      return Response.json({ error: 'Complete your purchase securely on Spring.', shopUrl: STORE }, { status: 410, headers });
    }
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...headers, Allow: 'GET' } });
  } catch (error) {
    return Response.json({ error: error instanceof SpringError ? error.message : 'The Spring shop is temporarily unavailable.' }, { status: error instanceof SpringError ? error.status : 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
