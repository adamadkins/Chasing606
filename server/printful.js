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
    const response = await fetcher('https://api.printful.com/store/products?limit=1&offset=0', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      return Response.json({
        provider: 'printful',
        connected: false,
        reason: response.status === 401 || response.status === 403 ? 'authorization_failed' : response.status === 404 ? 'endpoint_not_found' : response.status === 429 ? 'rate_limited' : response.status >= 500 ? 'printful_server_error' : 'printful_http_error',
        upstreamStatus: response.status
      }, { headers, status: 503 });
    }
    const data = await response.json();
    if (data.code !== 200 || !Array.isArray(data.result)) {
      return Response.json({ provider: 'printful', connected: false, reason: 'unexpected_response' }, { headers, status: 502 });
    }
    return Response.json({
      provider: 'printful',
      connected: true,
      productsAvailable: data.paging?.total ?? data.result.length,
      checkoutEnabled: false
    }, { headers });
  } catch (error) {
    return Response.json({ provider: 'printful', connected: false, reason: error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'request_timeout' : 'network_or_response_error' }, { headers, status: 503 });
  }
}
