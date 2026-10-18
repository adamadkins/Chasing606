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
    const storeId = String(stores.result[0].id);
    const response = await fetcher('https://api.printful.com/store/products?limit=1&offset=0', {
      headers: { Authorization: `Bearer ${token}`, 'X-PF-Store-Id': storeId, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return Response.json({ provider: 'printful', connected: true, catalogAccessible: false, reason: 'products_request_failed', upstreamStatus: response.status }, { status: 503, headers });
    const data = await response.json();
    if (data.code !== 200 || !Array.isArray(data.result)) return Response.json({ provider: 'printful', connected: true, catalogAccessible: false, reason: 'unexpected_response' }, { status: 502, headers });
    return Response.json({ provider: 'printful', connected: true, catalogAccessible: true, productsAvailable: data.paging?.total ?? data.result.length, checkoutEnabled: false }, { headers });
  } catch (error) {
    return Response.json({ provider: 'printful', connected: false, reason: error?.name === 'TimeoutError' ? 'request_timeout' : 'network_or_response_error' }, { status: 503, headers });
  }
}
