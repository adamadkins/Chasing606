// Read-only Printful connectivity check. This never exposes the API token,
// modifies orders, or changes the production Fourthwall checkout.
export async function printfulStatus(request, env, fetcher = fetch) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...headers, Allow: 'GET' } });
  }
  const token = env.PRINTFUL_API_TOKEN?.trim();
  if (!token) {
    return Response.json({ provider: 'printful', connected: false, reason: 'not_configured' }, { headers });
  }
  try {
    // The stores endpoint does not require a store-selection header. Use it
    // first to verify authentication without assuming a default store.
    const response = await fetcher('https://api.printful.com/stores', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      // Printful may return a safe machine-readable error code. Never relay its
      // raw response, which may contain account or request details.
      let providerCode = null;
      try {
        const errorBody = await response.json();
        const code = errorBody?.error?.code ?? errorBody?.code;
        if (typeof code === 'number' || (typeof code === 'string' && /^[a-zA-Z0-9_-]{1,60}$/.test(code))) providerCode = code;
      } catch {}
      return Response.json({
        provider: 'printful',
        connected: false,
        reason: response.status === 401 || response.status === 403 ? 'authorization_failed' : response.status === 404 ? 'endpoint_not_found' : response.status === 429 ? 'rate_limited' : response.status >= 500 ? 'printful_server_error' : 'printful_http_error',
        upstreamStatus: response.status,
        ...(providerCode !== null ? { providerCode } : {})
      }, { headers, status: 503 });
    }
    const data = await response.json();
    if (data.code !== 200 || !Array.isArray(data.result)) {
      return Response.json({ provider: 'printful', connected: false, reason: 'unexpected_response' }, { headers, status: 502 });
    }
    return Response.json({
      provider: 'printful',
      connected: true,
      storesAvailable: data.result.length,
      storeSelectionRequired: data.result.length !== 1,
      checkoutEnabled: false
    }, { headers });
  } catch (error) {
    return Response.json({ provider: 'printful', connected: false, reason: error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'request_timeout' : 'network_or_response_error' }, { headers, status: 503 });
  }
}

 
// Diagnostic-only catalog summary. Does not expose private product data or
// replace the Fourthwall catalog that customers currently see.
export async function printfulCatalogStatus(request, env, fetcher = fetch) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.method !== 'GET') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
  const token = env.PRINTFUL_API_TOKEN?.trim();
  if (!token) return Response.json({ provider: 'printful', connected: false, reason: 'not_configured' }, { status: 503, headers });
  try {
    const storesResponse = await fetcher('https://api.printful.com/stores', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!storesResponse.ok) return Response.json({ provider: 'printful', connected: false, reason: 'stores_request_failed', upstreamStatus: storesResponse.status }, { status: 503, headers });
    const stores = await storesResponse.json();
    if (!Array.isArray(stores.result) || stores.result.length !== 1 || !Number.isInteger(Number(stores.result[0]?.id))) {
      return Response.json({ provider: 'printful', connected: false, reason: 'store_selection_required' }, { status: 409, headers });
    }
    const response = await fetcher('https://api.printful.com/sync/products?limit=1&offset=0', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      let diagnostic = 'unspecified';
      let providerMessage = null;
      try {
        const body = await response.json();
        const rawMessage = body?.error?.message ?? body?.error?.reason ?? (typeof body?.result === 'string' ? body.result : null);
        const detail = typeof rawMessage === 'string' ? rawMessage.toLowerCase() : '';
        // Public diagnostic endpoint: report only recognized, non-sensitive messages.
        if (/not supported|not available|unsupported|invalid store type/i.test(detail)) providerMessage = 'This operation is not supported for the selected store.';
        else if (/store id|store-id|x-pf-store/i.test(detail)) providerMessage = 'Printful requires a store identifier.';
        else if (/permission|scope|access denied/i.test(detail)) providerMessage = 'Insufficient permissions for this operation.';
        if (/store.{0,40}(not found|not selected|not specified|id|required)|x-pf-store/i.test(detail)) diagnostic = 'store_selection';
        else if (/scope|permission|access|forbidden|unauthoriz/i.test(detail)) diagnostic = 'permissions';
        else if (/manual|api platform|platform|integration|not supported|not available/i.test(detail)) diagnostic = 'store_type';
        else if (/product/i.test(detail)) diagnostic = 'product_configuration';
        else if (/parameter|invalid|request/i.test(detail)) diagnostic = 'request_validation';
      } catch {}
      return Response.json({ provider: 'printful', connected: true, catalogAccessible: false, reason: 'products_request_failed', upstreamStatus: response.status, diagnostic, ...(providerMessage ? { providerMessage } : {}) }, { status: 503, headers });
    }
    const data = await response.json();
    if (data.code !== 200 || !Array.isArray(data.result)) return Response.json({ provider: 'printful', connected: true, catalogAccessible: false, reason: 'unexpected_response' }, { status: 502, headers });
    return Response.json({ provider: 'printful', connected: true, catalogAccessible: true, productsAvailable: data.paging?.total ?? data.result.length, catalogEndpoint: 'sync/products', checkoutEnabled: false }, { headers });
  } catch (error) {
    return Response.json({ provider: 'printful', connected: false, reason: error?.name === 'TimeoutError' ? 'request_timeout' : 'network_or_response_error' }, { status: 503, headers });
  }
}

 
// Safe read-only preview for product migration; this route is not used by the live shop.
export async function printfulCatalogPreview(request, env, fetcher = fetch) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.method !== 'GET') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
  const token = env.PRINTFUL_API_TOKEN?.trim();
  if (!token) return Response.json({ error: 'Printful not configured.' }, { status: 503, headers });
  try {
    const response = await fetcher('https://api.printful.com/sync/products?limit=20&offset=0', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return Response.json({ error: 'Printful catalog unavailable.', upstreamStatus: response.status }, { status: 503, headers });
    const data = await response.json();
    if (data.code !== 200 || !Array.isArray(data.result)) return Response.json({ error: 'Unexpected Printful response.' }, { status: 502, headers });
    const products = data.result.map(item => ({
      id: item.id,
      name: item.name,
      thumbnail: typeof item.thumbnail_url === 'string' && item.thumbnail_url.startsWith('https://') ? item.thumbnail_url : null,
      synced: Number(item.synced) || 0,
      variants: Number(item.variants) || 0
    }));
    return Response.json({ provider: 'printful', previewOnly: true, products, total: data.paging?.total ?? products.length, checkoutEnabled: false }, { headers });
  } catch {
    return Response.json({ error: 'Printful catalog unavailable.' }, { status: 503, headers });
  }
}

export async function printfulVariantPreview(request, env, fetcher = fetch) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.method !== 'GET') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
  const token = env.PRINTFUL_API_TOKEN?.trim();
  if (!token) return Response.json({ error: 'Printful not configured.' }, { status: 503, headers });
  try {
    const listing = await fetcher('https://api.printful.com/sync/products?limit=1&offset=0', {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!listing.ok) return Response.json({ error: 'Variants unavailable.', upstreamStatus: listing.status }, { status: 503, headers });
    const listingData = await listing.json();
    const syncProductId = listingData.result?.[0]?.id;
    if (!syncProductId) return Response.json({ error: 'No synced Printful product found.' }, { status: 404, headers });
    const response = await fetcher(`https://api.printful.com/sync/products/${syncProductId}`, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return Response.json({ error: 'Variants unavailable.', upstreamStatus: response.status }, { status: 503, headers });
    const data = await response.json();
    if (data.code !== 200 || !Array.isArray(data.result?.sync_variants)) return Response.json({ error: 'Unexpected Printful response.' }, { status: 502, headers });
    return Response.json({
      previewOnly: true,
      productId: syncProductId,
      variants: data.result.sync_variants.map(v => ({
        id: v.id, variantId: v.variant_id, name: v.name,
        retailPrice: v.retail_price, currency: v.currency || 'USD', synced: v.synced
      })),
      checkoutEnabled: false
    }, { headers });
  } catch {
    return Response.json({ error: 'Variants unavailable.' }, { status: 503, headers });
  }
}

const safeImage = url => typeof url === 'string' && /^https:\/\//i.test(url) ? url : null;
const printfulHeaders = token => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });
const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

async function printfulJson(fetcher, url, token, options = {}) {
  const response = await fetcher(url, {
    ...options,
    headers: { ...printfulHeaders(token), ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000)
  });
  let data = null;
  try { data = await response.json(); } catch {}
  if (!response.ok || data?.code !== 200) {
    const error = new Error('Printful request failed.');
    error.status = response.status;
    const providerCode = data?.error?.reason ?? data?.error?.code;
    if (typeof providerCode === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(providerCode)) error.providerCode = providerCode;
    throw error;
  }
  return data.result;
}

export function mockupRequestFor(source, printfileInfo = {}) {
  const synced = (source?.sync_variants || []).filter(variant => variant.synced === true);
  const representatives = [];
  const seenColors = new Set();
  for (const variant of synced) {
    const color = variant.color || String(variant.name || '').split(' / ').at(-2) || '';
    const key = color.toLowerCase();
    if (!seenColors.has(key) && Number.isInteger(Number(variant.variant_id))) {
      representatives.push(variant);
      seenColors.add(key);
    }
  }
  const primary = representatives[0] || synced[0];
  const productId = Number(primary?.product?.product_id);
  const files = (primary?.files || []).flatMap(file => {
    if (file.type === 'preview') return [];
    const imageUrl = safeImage(file.url) || safeImage(file.preview_url);
    if (!imageUrl) return [];
    const rawPlacement = !file.type || file.type === 'default' ? 'front' : file.type;
    const placement = Object.hasOwn(printfileInfo.available_placements || {}, rawPlacement)
      ? rawPlacement
      : rawPlacement.replace(/^embroidery_/, '');
    return [{
      placement,
      image_url: imageUrl,
      ...(Array.isArray(file.options) && file.options.length ? { options: file.options } : {})
    }];
  });
  const uniqueFiles = [...new Map(files.map(file => [file.placement, file])).values()];
  if (!productId || !representatives.length || !uniqueFiles.length) return null;

  const allGroups = Array.isArray(printfileInfo.option_groups) ? printfileInfo.option_groups : [];
  const allOptions = Array.isArray(printfileInfo.options) ? printfileInfo.options : [];
  const flat = allGroups.find(value => /flat|product|default/i.test(value) && !/life|model/i.test(value));
  const lifestyle = allGroups.find(value => /life|model/i.test(value));
  const front = allOptions.find(value => /front/i.test(value));
  const back = allOptions.find(value => /back/i.test(value));
  const optionGroups = [...new Set([flat, lifestyle].filter(Boolean))];
  const options = [...new Set([front, back].filter(Boolean))];
  const productOptions = Object.fromEntries((primary.options || [])
    .filter(option => typeof option?.id === 'string' && option.value !== undefined)
    .map(option => [option.id, option.value]));
  return {
    productId,
    colorVariants: Object.fromEntries(representatives.map(variant => {
      const color = variant.color || String(variant.name || '').split(' / ').at(-2) || 'Default';
      return [color, Number(variant.variant_id)];
    })),
    body: {
      variant_ids: representatives.map(variant => Number(variant.variant_id)),
      format: 'jpg',
      width: 1200,
      files: uniqueFiles,
      ...(Object.keys(productOptions).length ? { product_options: productOptions } : {}),
      ...(optionGroups.length ? { option_groups: optionGroups } : {}),
      ...(options.length ? { options } : {})
    }
  };
}

export function galleriesFromMockups(mockups, colorVariants) {
  const output = {};
  for (const [color, variantId] of Object.entries(colorVariants || {})) {
    const candidates = [];
    for (const mockup of Array.isArray(mockups) ? mockups : []) {
      if (Array.isArray(mockup.variant_ids) && !mockup.variant_ids.map(Number).includes(Number(variantId))) continue;
      const baseLabel = [mockup.placement, mockup.display_name].filter(Boolean).join(' ');
      const baseUrl = safeImage(mockup.mockup_url);
      if (baseUrl) candidates.push({ url: baseUrl, side: mockup.placement || mockup.display_name || '', style: 'product', label: baseLabel });
      for (const extra of Array.isArray(mockup.extra) ? mockup.extra : []) {
        const url = safeImage(extra.url);
        if (url) candidates.push({
          url,
          side: extra.option || extra.title || mockup.placement || '',
          style: extra.option_group || extra.title || '',
          label: [baseLabel, extra.title, extra.option, extra.option_group].filter(Boolean).join(' ')
        });
      }
    }
    const unique = [...new Map(candidates.map(item => [item.url, item])).values()];
    const selected = [];
    for (const [side, style] of [
      [/front/i, /flat|product|default/i],
      [/back/i, /flat|product|default/i],
      [/front/i, /life|model/i],
      [/back/i, /life|model/i]
    ]) {
      const match = unique.find(item => side.test(item.side) && style.test(item.style) && !selected.includes(item));
      if (match) selected.push(match);
    }
    for (const item of unique) if (selected.length < 4 && !selected.includes(item)) selected.push(item);
    output[color] = selected.slice(0, 4).map(item => item.url);
  }
  return output;
}

async function readCache(cache, key) {
  if (!cache) return null;
  const response = await cache.match(key);
  if (!response) return null;
  try { return await response.json(); } catch { return null; }
}

async function writeCache(cache, key, value, seconds) {
  if (!cache) return;
  await cache.put(key, Response.json(value, { headers: { 'Cache-Control': `public, max-age=${seconds}` } }));
}

export async function generatedMockupState(request, source, token, fetcher = fetch, cache = globalThis.caches?.default) {
  const synced = (source?.sync_variants || []).filter(variant => variant.synced === true);
  const primary = synced[0];
  const productId = Number(primary?.product?.product_id);
  if (!productId) return { status: 'unavailable', reason: 'catalog_product_missing' };
  const fingerprint = slug([source.sync_product?.id, ...synced.map(v => `${v.variant_id}:${(v.files || []).map(f => f.hash || f.id || f.url).join(',')}`)].join('|'));
  const cacheKey = new Request(`${new URL(request.url).origin}/api/printful/mockup-cache/${source.sync_product?.id}/${fingerprint}`);
  const cached = await readCache(cache, cacheKey);
  const now = Date.now();
  if (cached?.status === 'completed' && now - cached.createdAt < 48 * 60 * 60 * 1000) return cached;

  if (cached?.status === 'pending' && cached.taskKey) {
    if (now - cached.createdAt < 10000) return cached;
    const task = await printfulJson(fetcher, `https://api.printful.com/mockup-generator/task?task_key=${encodeURIComponent(cached.taskKey)}`, token);
    if (task.status === 'pending') {
      await writeCache(cache, cacheKey, { ...cached, checkedAt: now }, 600);
      return { ...cached, checkedAt: now };
    }
    if (task.status !== 'completed') {
      const failed = { status: 'failed', reason: 'generation_failed', createdAt: now };
      await writeCache(cache, cacheKey, failed, 300);
      return failed;
    }
    const completed = { status: 'completed', galleries: galleriesFromMockups(task.mockups, cached.colorVariants), createdAt: now };
    await writeCache(cache, cacheKey, completed, 48 * 60 * 60);
    return completed;
  }

  const isEmbroidery = (primary.files || []).some(file => /embroidery/i.test(file.type || ''));
  const technique = isEmbroidery ? '?technique=EMBROIDERY' : '';
  let printfileInfo;
  try {
    printfileInfo = await printfulJson(fetcher, `https://api.printful.com/mockup-generator/printfiles/${productId}${technique}`, token);
  } catch (error) {
    return { status: 'unavailable', reason: 'printfile_request_failed', upstreamStatus: error?.status || 502 };
  }
  const generation = mockupRequestFor(source, printfileInfo);
  if (!generation) return { status: 'unavailable', reason: 'print_file_missing' };
  let task;
  try {
    task = await printfulJson(fetcher, `https://api.printful.com/mockup-generator/create-task/${generation.productId}`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(generation.body)
    });
  } catch (error) {
    if (error?.status !== 400) return { status: error?.status === 429 ? 'rate_limited' : 'unavailable', reason: 'task_creation_failed', upstreamStatus: error?.status || 502, providerCode: error?.providerCode };
    // Some embroidery products reject saved file/product options even though
    // the same image and placement work with Printful's default mockup style.
    const minimalBody = {
      variant_ids: generation.body.variant_ids,
      format: generation.body.format,
      width: generation.body.width,
      files: generation.body.files.map(file => ({ placement: file.placement, image_url: file.image_url }))
    };
    try {
      task = await printfulJson(fetcher, `https://api.printful.com/mockup-generator/create-task/${generation.productId}`, token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(minimalBody)
      });
    } catch (fallbackError) {
      return { status: fallbackError?.status === 429 ? 'rate_limited' : 'unavailable', reason: 'task_creation_failed', upstreamStatus: fallbackError?.status || 502, providerCode: fallbackError?.providerCode };
    }
  }
  const pending = { status: task.status === 'completed' ? 'completed' : 'pending', taskKey: task.task_key, colorVariants: generation.colorVariants, createdAt: now };
  if (task.status === 'completed') pending.galleries = galleriesFromMockups(task.mockups, generation.colorVariants);
  await writeCache(cache, cacheKey, pending, task.status === 'completed' ? 48 * 60 * 60 : 600);
  return pending;
}

// Read-only storefront-shaped preview. It may create a Printful mockup task,
// but never creates products, orders, checkouts, or fulfillment actions.
export async function printfulStorefrontPreview(request, env, fetcher = fetch, cache = globalThis.caches?.default) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.method !== 'GET') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
  const token = env.PRINTFUL_API_TOKEN?.trim();
  if (!token) return Response.json({ error: 'Printful not configured.' }, { status: 503, headers });
  try {
    const listing = await printfulJson(fetcher, 'https://api.printful.com/sync/products?limit=1&offset=0', token);
    const syncProductId = listing?.[0]?.id;
    if (!syncProductId) return Response.json({ error: 'No synced Printful product found.' }, { status: 404, headers });
    const source = await printfulJson(fetcher, `https://api.printful.com/sync/products/${syncProductId}`, token);
    if (!Array.isArray(source?.sync_variants)) return Response.json({ error: 'Unexpected product data.' }, { status: 502, headers });
    const primaryVariant = source.sync_variants.find(v => v.synced === true);
    const primarySegments = String(primaryVariant?.name || '').split(' / ').map(s => s.trim());
    const primaryColor = primaryVariant?.color || (primarySegments.length >= 3 ? primarySegments.at(-2) : '');
    const productThumbnail = safeImage(source.sync_product?.thumbnail_url);
    const variantImages = (v, color) => {
      // Printful files contain printable artwork, not necessarily product mockups.
      // Only use the variant's product imagery for customer-facing galleries.
      return [...new Set([
        safeImage(v.product?.image),
        safeImage(v.thumbnail_url),
        color === primaryColor ? productThumbnail : null
      ].filter(Boolean))];
    };
    const variants = source.sync_variants.filter(v => v.synced === true).map(v => {
      const segments = String(v.name || '').split(' / ').map(s => s.trim());
      const size = v.size || segments.at(-1) || '';
      const color = v.color || (segments.length >= 3 ? segments.at(-2) : '');
      const price = Number(v.retail_price);
      const images = variantImages(v, color);
      return {
        id: String(v.id), label: [color, size].filter(Boolean).join(' / '),
        color, size, price: Number.isFinite(price) ? price : 0,
        currencyCode: v.currency || 'USD', available: true,
        image: images[0] || null, images
      };
    });
    const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
    const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
    const prices = variants.map(v => v.price).filter(p => p > 0);
    const image = productThumbnail;
    const imagesByColor = Object.fromEntries(colors.map(color => [color, variants.find(v => v.color === color && v.image)?.image || null]));
    let mockupState = { status: 'unavailable' };
    try { mockupState = await generatedMockupState(request, source, token, fetcher, cache); } catch (error) {
      mockupState = { status: error?.status === 429 ? 'rate_limited' : 'unavailable' };
    }
    const galleryByColor = Object.fromEntries(colors.map(color => {
      const generated = mockupState.galleries?.[color] || [];
      const fallback = [...new Set(variants.filter(v => v.color === color).flatMap(v => v.images))];
      return [color, [...new Set([...generated, ...fallback])].slice(0, 4)];
    }));
    return Response.json({
      previewOnly: true, checkoutEnabled: false, mockupStatus: mockupState.status,
      ...(mockupState.reason ? { mockupReason: mockupState.reason, mockupUpstreamStatus: mockupState.upstreamStatus } : {}),
      ...(mockupState.providerCode ? { mockupProviderCode: mockupState.providerCode } : {}),
      product: {
        id: String(source.sync_product?.id || syncProductId),
        name: source.sync_product?.name || 'Printful test product',
        description: source.sync_product?.description || `Preview the available colors and sizes for this ${source.sync_product?.name || 'Printful product'}.`,
        image, images: image ? [image] : [], imagesByColor, galleryByColor, colors, sizes, variants,
        price: prices.length ? Math.min(...prices) : 0,
        currencyCode: 'USD', available: variants.length > 0
      }
    }, { headers });
  } catch {
    return Response.json({ error: 'Product unavailable.' }, { status: 503, headers });
  }
}
