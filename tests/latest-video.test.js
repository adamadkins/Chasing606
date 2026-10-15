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
