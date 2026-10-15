const channelUrl = 'https://www.youtube.com/@Chasing606';
const channelPattern = /^UC[\w-]{22}$/;
const decode = value => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n))).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
async function read(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/atom+xml,text/html' } });
  if (!response.ok) throw new Error('YouTube is unavailable');
  return response.text();
}
export async function loadLatestVideo({ fetcher = fetch, channelId } = {}) {
  if (!channelPattern.test(channelId ?? '')) {
    const html = await read(channelUrl, fetcher);
    channelId = html.match(/"channelMetadataRenderer"\s*:\s*\{[\s\S]*?"externalId"\s*:\s*"(UC[\w-]{22})"/)?.[1]
      ?? html.match(/<link[^>]+href="https:\/\/www.youtube.com\/channel\/(UC[\w-]{22})"/)?.[1];
    if (!channelId) throw new Error('Channel ID not available');
  }
  const feed = await read(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, fetcher);
  const entries = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => {
    const id = entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const published = entry.match(/<published>(.*?)<\/published>/)?.[1];
    return id && title && Number.isFinite(Date.parse(published)) ? { id, title: decode(title), published } : null;
  }).filter(Boolean).sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  if (!entries.length) throw new Error('No public uploads available');
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
  } catch {
    return Response.json({ error: 'Latest upload temporarily unavailable', channelUrl }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
