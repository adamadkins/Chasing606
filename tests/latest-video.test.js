import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLatestVideo } from '../functions/api/latest-video.js';
const channelId = 'UC' + 'a'.repeat(22);
const entry = (id, title, date) => `<entry><yt:videoId>${id}</yt:videoId><title>${title}</title><published>${date}</published></entry>`;
test('resolves the channel and selects newest upload, decoding its title', async () => {
 const requested = [];
 const video = await loadLatestVideo({ fetcher: async url => {
   requested.push(url);
   return new Response(requested.length === 1 ? `{"channelMetadataRenderer":{"title":"Chasing606","externalId":"${channelId}"}}` : `<feed>${entry('aaaaaaaaaaa', 'Older', '2026-01-01T00:00:00Z')}${entry('bbbbbbbbbbb', 'Sign &amp; Silence', '2026-02-01T00:00:00Z')}</feed>`);
 }});
 assert.equal(video.id, 'bbbbbbbbbbb');
 assert.equal(video.title, 'Sign & Silence');
 assert.equal(requested[1], `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
});
test('configured channel skips lookup; malformed entries are excluded', async () => {
 let calls = 0;
 const video = await loadLatestVideo({ channelId, fetcher: async () => { calls++; return new Response(`<feed>${entry('invalid', 'Bad', '2026-03-01')}${entry('ccccccccccc', 'Valid', '2026-02-01')}</feed>`); }});
 assert.equal(calls, 1); assert.equal(video.id, 'ccccccccccc');
});
test('unavailable upstream and empty feeds fail instead of inventing a video', async () => {
 await assert.rejects(loadLatestVideo({ channelId, fetcher: async () => new Response('', { status: 403 }) }));
 await assert.rejects(loadLatestVideo({ channelId, fetcher: async () => new Response('<feed/>') }));
});

test('Worker routes API requests and serves the static site through assets', async () => {
 const { default: worker } = await import('../worker/index.js');
 const response = await worker.fetch(new Request('https://example.com/'), { ASSETS: { fetch: async () => new Response('site') } });
 assert.equal(await response.text(), 'site');
 const denied = await worker.fetch(new Request('https://example.com/api/latest-video', { method:'POST' }), {});
 assert.equal(denied.status, 405);
});

test('discovers channel ID from current metadata markup', async () => {
 const requested = [];
 const video = await loadLatestVideo({ fetcher: async url => {
   requested.push(url);
   return new Response(requested.length === 1
     ? `<html><meta itemprop="channelId" content="${channelId}"></html>`
     : `<feed>${entry('ddddddddddd', 'Current episode', '2026-10-16T00:00:00Z')}</feed>`);
 }});
 assert.equal(requested.length, 2);
 assert.equal(video.id, 'ddddddddddd');
});
test('discovers channel ID from YouTube channelId JSON metadata', async () => {
 let calls = 0;
 const video = await loadLatestVideo({ fetcher: async () => {
   calls++;
   return new Response(calls === 1 ? `{"channelId":"${channelId}"}` : `<feed>${entry('eeeeeeeeeee', 'New episode', '2026-10-16T00:00:00Z')}</feed>`);
 }});
 assert.equal(video.id, 'eeeeeeeeeee');
});
