const channelUrl = 'https://www.youtube.com/@Chasing606';
const channelPattern = /^UC[\w-]{22}$/;
const decode = value => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n))).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
async function read(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/atom+xml,text/html,application/xml' } });
  if (!response.ok) throw new Error(`YouTube returned HTTP ${response.status} for ${url.includes('/feeds/') ? 'video feed' : 'channel page'}`);
  return response.text();
}
function findChannelId(html) {
  // YouTube has used several metadata formats. Check them without relying on
  // a single object/property ordering or a fragile page-renderer regex.
  const patterns = [
    /<meta[^>]+itemprop=["']channelId["'][^>]+content=["'](UC[\w-]{22})["']/i,
    /<meta[^>]+content=["'](UC[\w-]{22})["'][^>]+itemprop=["']channelId["']/i,
    /"externalId"\s*:\s*"(UC[\w-]{22})"/,
    /"channelId"\s*:\s*"(UC[\w-]{22})"/,
    /"browseId"\s*:\s*"(UC[\w-]{22})"/,
    /<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']*\/channel\/(UC[\w-]{22})/i,
    /<link[^>]+href=["'][^"']*\/channel\/(UC[\w-]{22})[^"']*["'][^>]+rel=["']canonical["']/i,
    /"rssUrl"\s*:\s*"[^"']*channel_id=(UC[\w-]{22})"/i,
    /https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})/
  ];
  return patterns.map(pattern => html.match(pattern)?.[1]).find(Boolean);
}
export async function loadLatestVideo({ fetcher = fetch, channelId } = {}) {
  if (!channelPattern.test(channelId ?? '')) {
    const pages = [channelUrl, `${channelUrl}/videos`, `https://www.youtube.com/@Chasing606/about`];
    for (const page of pages) {
      try {
        channelId = findChannelId(await read(page, fetcher));
        if (channelId) break;
      } catch { /* Try another public channel page. */ }
    }
    if (!channelId) throw new Error('channel_id_unresolved: YouTube channel metadata could not be read; configure YOUTUBE_CHANNEL_ID in Cloudflare Worker settings');
  }
  const feed = await read(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, fetcher);
  const entries = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => {
    const id = entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const published = entry.match(/<published>(.*?)<\/published>/)?.[1];
    return id && title && Number.isFinite(Date.parse(published)) ? { id, title: decode(title), published } : null;
  }).filter(Boolean).sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  if (!entries.length) throw new Error('empty_feed: YouTube returned no parseable public uploads');
  return { ...entries[0], channelUrl };
}
export async function onRequestGet({ request, env = {} }) {
  const cache = globalThis.caches?.default;
  const cacheKey = new Request(new URL('/api/latest-video', request.url));
  const cached = await cache?.match(cacheKey);
  if (cached) return cached;
  try {
    const video = await loadLatestVideo({ channelId: env.YOUTUBE_CHANNEL_ID });
    const response = Response.json(video, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=900' } });
    await cache?.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    // Return a bounded, actionable diagnostic without exposing credentials.
    const detail = error instanceof Error ? error.message : 'Unexpected upstream error';
    const reason = detail.startsWith('channel_id_unresolved') ? 'channel_id_unresolved'
      : detail.startsWith('empty_feed') ? 'empty_feed'
      : /HTTP \d+ for video feed/.test(detail) ? 'youtube_feed_http_error'
      : /HTTP \d+ for channel page/.test(detail) ? 'youtube_channel_http_error'
      : /timeout|timed out|abort/i.test(detail) ? 'youtube_timeout'
      : 'youtube_fetch_failed';
    return Response.json({ error: 'Latest upload temporarily unavailable', reason, detail: detail.slice(0, 220), channelUrl }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
