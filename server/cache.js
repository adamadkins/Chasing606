// Edge caching with a stale fallback, for upstreams we do not control.
//
// A fresh copy is served while it is young. If a refresh fails (Spring or
// YouTube is down or changed its markup), the last good copy is served instead
// of an error. Outside Cloudflare (local dev, tests) there is no edge cache and
// the loader simply runs.

const CACHE_ORIGIN = 'https://edge-cache.internal';

/**
 * @param {{ waitUntil?: (promise: Promise<unknown>) => void } | undefined} ctx
 * @param {string} key unique name for this resource
 * @param {{ ttl: number, staleTtl: number }} options seconds to treat the copy as fresh / usable as a fallback
 * @param {() => Promise<unknown>} load fetches the data from upstream
 * @returns {Promise<{ data: unknown, stale: boolean }>}
 */
export async function withEdgeCache(ctx, key, { ttl, staleTtl }, load) {
  const cache = globalThis.caches?.default;
  const freshKey = new Request(`${CACHE_ORIGIN}/${key}`);
  const staleKey = new Request(`${CACHE_ORIGIN}/${key}?stale`);

  const fresh = await cache?.match(freshKey);
  if (fresh) return { data: await fresh.json(), stale: false };

  try {
    const data = await load();
    if (cache) {
      const store = (request, maxAge) =>
        cache.put(request, Response.json(data, { headers: { 'Cache-Control': `public, max-age=${maxAge}` } }));
      const writes = Promise.all([store(freshKey, ttl), store(staleKey, staleTtl)]).catch(() => {});
      ctx?.waitUntil ? ctx.waitUntil(writes) : await writes;
    }
    return { data, stale: false };
  } catch (error) {
    const stale = await cache?.match(staleKey);
    if (stale) return { data: await stale.json(), stale: true };
    throw error;
  }
}
