import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../../server/api.js';
import { withEdgeCache } from '../../server/cache.js';
import worker from '../../worker/index.js';

const spring = rawTitle => {
  const product = {
    currency: 'USD', description: '', listingId: 1, primaryProductId: 2, primaryProductType: 'Hoodie', title: rawTitle, url: 'item',
    primaryProduct: [{ color: 'Black', inventoryCount: 3, availableSizes: [{ id: 1, label: 'M', price: '30' }], sizes: [{ id: 1, label: 'M', price: '30' }], images: [] }]
  };
  const part = `9:${JSON.stringify(['$', 'c', null, { products: [product] }])}`;
  return new Response(`<script>self.__next_f.push([1,${JSON.stringify(part)}])</script>`);
};

const request = (path, method = 'GET') => new Request(`https://site.test${path}`, { method });
const quiet = fn => async () => {
  const original = console.error;
  console.error = () => {};
  try { await fn(); } finally { console.error = original; }
};

test('GET /api/products returns the catalog', async () => {
  const response = await handleApi(request('/api/products'), { fetcher: async () => spring('Hoodie') });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /max-age=300/);
  const body = await response.json();
  assert.equal(body.products[0].name, 'Hoodie');
});

test('upstream failures return a generic 502 without leaking details', quiet(async () => {
  const response = await handleApi(request('/api/products'), { fetcher: async () => { throw new Error('secret internal detail'); } });
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(JSON.stringify(await response.json()), /secret/);
}));

test('latest video failures report a short reason', quiet(async () => {
  const response = await handleApi(request('/api/latest-video'), { fetcher: async () => new Response('', { status: 404 }) });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.reason, 'youtube_feed_http_error');
  assert.equal(body.detail, undefined);
}));

test('unknown routes are 404 and non-GET methods are 405', async () => {
  assert.equal((await handleApi(request('/api/nope', 'POST'))).status, 404);
  const denied = await handleApi(request('/api/products', 'POST'));
  assert.equal(denied.status, 405);
  assert.equal(denied.headers.get('allow'), 'GET, HEAD');
});

test('the Worker sends /api/* to the API and everything else to static assets', async () => {
  const env = { ASSETS: { fetch: async () => new Response('site') } };
  assert.equal(await (await worker.fetch(request('/merch'), env, {})).text(), 'site');
  assert.equal((await worker.fetch(request('/api/latest-video', 'POST'), env, {})).status, 405);
  assert.equal((await worker.fetch(request('/api/nope'), env, {})).status, 404);
});

test('edge cache serves the last good copy when a refresh fails', async () => {
  const store = new Map();
  globalThis.caches = {
    default: {
      match: async req => store.get(req.url)?.clone(),
      put: async (req, res) => { store.set(req.url, res); }
    }
  };
  try {
    let fail = false;
    const load = async () => { if (fail) throw new Error('down'); return { n: 1 }; };
    assert.deepEqual(await withEdgeCache(undefined, 'k', { ttl: 1, staleTtl: 10 }, load), { data: { n: 1 }, stale: false });
    // Expire only the fresh copy, as the real cache would after `ttl`.
    store.delete('https://edge-cache.internal/k');
    fail = true;
    assert.deepEqual(await withEdgeCache(undefined, 'k', { ttl: 1, staleTtl: 10 }, load), { data: { n: 1 }, stale: true });
    store.clear();
    await assert.rejects(withEdgeCache(undefined, 'k', { ttl: 1, staleTtl: 10 }, load), /down/);
  } finally {
    delete globalThis.caches;
  }
});
