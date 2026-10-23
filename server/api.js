// The site's JSON API. Used by the Cloudflare Worker and by the Vite dev server,
// so local development behaves like production.

import { withEdgeCache } from './cache.js';
import { loadSpringCatalog, SpringError } from './spring.js';
import { CHANNEL_HANDLE_URL, CHANNEL_ID, failureReason, loadLatestVideo } from './youtube.js';

const json = (body, init = {}) => Response.json(body, init);

function methodNotAllowed() {
  return json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } });
}

function dataResponse({ data, stale }, cacheControl) {
  return json(data, { headers: { 'Cache-Control': stale ? 'public, max-age=60' : cacheControl, ...(stale && { 'X-Data-Stale': 'true' }) } });
}

async function productsRoute({ ctx, fetcher }) {
  try {
    const result = await withEdgeCache(ctx, 'products', { ttl: 300, staleTtl: 86_400 }, () => loadSpringCatalog(fetcher));
    return dataResponse(result, 'public, max-age=300');
  } catch (error) {
    console.error('products failed:', error);
    const message = error instanceof SpringError ? error.message : 'The shop is temporarily unavailable.';
    return json({ error: message }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

async function latestVideoRoute({ env, ctx, fetcher }) {
  try {
    const channelId = env.YOUTUBE_CHANNEL_ID || CHANNEL_ID;
    const result = await withEdgeCache(ctx, 'latest-video', { ttl: 900, staleTtl: 604_800 }, () => loadLatestVideo({ fetcher, channelId }));
    return dataResponse(result, 'public, max-age=300, s-maxage=900');
  } catch (error) {
    console.error('latest-video failed:', error);
    return json(
      { error: 'Latest upload temporarily unavailable', reason: failureReason(error), channelUrl: CHANNEL_HANDLE_URL },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

const routes = {
  '/api/products': productsRoute,
  '/api/latest-video': latestVideoRoute
};

/**
 * @param {Request} request
 * @param {{ env?: Record<string, string>, ctx?: { waitUntil?: Function }, fetcher?: typeof fetch }} [options]
 */
export async function handleApi(request, { env = {}, ctx, fetcher = fetch } = {}) {
  const route = routes[new URL(request.url).pathname];
  if (!route) return json({ error: 'Not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed();
  return route({ env, ctx, fetcher });
}
