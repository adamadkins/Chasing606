import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLatestVideo, failureReason } from '../../server/youtube.js';
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

const videosPage = ({ owner = 'UCl9Y60eT8tlw0VEvcLcPijA', latest = true, legacy = false } = {}) => `<script>var ytInitialData = ${JSON.stringify({
 metadata: { channelMetadataRenderer: { externalId: owner } },
 // A decoy outside the selected tab must never be used.
 unrelated: { videoId: 'xxxxxxxxxxx' },
 contents: { twoColumnBrowseResultsRenderer: { tabs: [
  { tabRenderer: { selected: false, content: { videoRenderer: { videoId: 'xxxxxxxxxxx' } } } },
  { tabRenderer: { selected: true, content: { richGridRenderer: {
   header: { feedFilterChipBarRenderer: { contents: [{ chipCloudChipRenderer: { isSelected: latest, text: { runs: [{ text: 'Latest' }] } } }] } },
   contents: [{ richItemRenderer: { content: legacy
    ? { videoRenderer: { videoId: 'ffffffffff1', title: { runs: [{ text: 'Latest hunt' }] } } }
    : { lockupViewModel: { contentId: 'ffffffffff1', contentType: 'LOCKUP_CONTENT_TYPE_VIDEO', metadata: { lockupMetadataViewModel: { title: { content: 'Latest hunt' } } } } }
   } }]
  } } } }
 ] } }
})};</script>`;
for (const legacy of [false, true]) {
 test(`feed 404 falls back to selected Latest videos, legacy=${legacy}`, async () => {
  const urls = [];
  const video = await loadLatestVideo({ channelId, fetcher: async url => {
   urls.push(url);
   return url.includes('/feeds/') ? new Response('', { status: 404 }) : new Response(videosPage({ legacy }));
  } });
  assert.equal(video.id, 'ffffffffff1');
  assert.equal(video.title, 'Latest hunt');
  assert.equal(video.published, null);
  assert.equal(urls[1], 'https://www.youtube.com/@Chasing606/videos?hl=en');
 });
}
test('fallback rejects other channels, wrong sort and malformed page data', async () => {
 for (const html of [videosPage({ owner: channelId }), videosPage({ latest: false }), '<html>Consent required</html>']) {
  await assert.rejects(loadLatestVideo({ channelId, fetcher: async url => url.includes('/feeds/') ? new Response('', { status: 404 }) : new Response(html) }), /HTTP 404/);
 }
});

test('failure reasons are short labels that never echo upstream details', () => {
 assert.equal(failureReason(new Error('YouTube returned HTTP 404 for video feed')), 'youtube_feed_http_error');
 assert.equal(failureReason(new Error('empty_feed: nothing')), 'empty_feed');
 assert.equal(failureReason(new DOMException('The operation timed out', 'TimeoutError')), 'youtube_timeout');
 assert.equal(failureReason('weird'), 'youtube_fetch_failed');
});
