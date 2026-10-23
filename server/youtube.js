// Finds the newest public upload on the Chasing 606 YouTube channel without an
// API key: first from the channel's Atom feed, then (if YouTube refuses the
// feed) from the channel's "Videos" tab in "Latest" order.

export const CHANNEL_HANDLE_URL = 'https://www.youtube.com/@Chasing606';
export const CHANNEL_ID = 'UCl9Y60eT8tlw0VEvcLcPijA';

const CHANNEL_ID_PATTERN = /^UC[\w-]{22}$/;
const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

const XML_ENTITIES = { quot: '"', apos: "'", lt: '<', gt: '>', amp: '&' };

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) =>
      String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .replace(/&(quot|apos|lt|gt|amp);/g, (_, name) => XML_ENTITIES[name]);
}

async function readText(url, fetcher) {
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: 'application/atom+xml,text/html,application/xml' }
  });
  if (!response.ok) {
    throw new Error(`YouTube returned HTTP ${response.status} for ${url.includes('/feeds/') ? 'video feed' : 'channel page'}`);
  }
  return response.text();
}

// YouTube has used several metadata formats over time, so try them all rather
// than depending on one property order or renderer.
const CHANNEL_ID_PATTERNS = [
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

function findChannelId(html) {
  return CHANNEL_ID_PATTERNS.map(pattern => html.match(pattern)?.[1]).find(Boolean);
}

async function latestFromFeed({ fetcher, channelId }) {
  if (!CHANNEL_ID_PATTERN.test(channelId ?? '')) {
    for (const page of [CHANNEL_HANDLE_URL, `${CHANNEL_HANDLE_URL}/videos`, `${CHANNEL_HANDLE_URL}/about`]) {
      try {
        channelId = findChannelId(await readText(page, fetcher));
        if (channelId) break;
      } catch {
        // Try the next public channel page.
      }
    }
    if (!channelId) {
      throw new Error('channel_id_unresolved: YouTube channel metadata could not be read; set YOUTUBE_CHANNEL_ID');
    }
  }

  const feed = await readText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, fetcher);
  const entries = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(([, entry]) => {
      const id = entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
      const published = entry.match(/<published>(.*?)<\/published>/)?.[1];
      return id && title && Number.isFinite(Date.parse(published)) ? { id, title: decodeXml(title), published } : null;
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published));

  if (!entries.length) throw new Error('empty_feed: YouTube returned no parseable public uploads');
  return { ...entries[0], channelUrl: CHANNEL_HANDLE_URL };
}

function latestFromVideosPage(html) {
  // Only read the selected channel tab, never recommendations or menu IDs.
  const json = html.match(/(?:var\s+ytInitialData\s*=|window\["ytInitialData"\]\s*=)\s*({[\s\S]*?})\s*;<\/script>/)?.[1];
  if (!json) throw new Error('videos_page_unavailable: YouTube channel data missing');

  const data = JSON.parse(json);
  if (data.metadata?.channelMetadataRenderer?.externalId !== CHANNEL_ID) {
    throw new Error('videos_page_unavailable: Unexpected YouTube channel');
  }

  const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs ?? [];
  const grid = tabs.find(tab => tab.tabRenderer?.selected)?.tabRenderer?.content?.richGridRenderer;

  // The default Videos view is newest first. Refuse any other sort order.
  const chips = grid?.header?.feedFilterChipBarRenderer?.contents ?? [];
  const latestSelected = chips.some(chip =>
    chip.chipCloudChipRenderer?.isSelected && chip.chipCloudChipRenderer?.text?.runs?.some(run => run.text === 'Latest'));
  if (chips.length && !latestSelected) throw new Error('videos_page_unavailable: Latest sort not selected');

  for (const item of grid?.contents ?? []) {
    const content = item.richItemRenderer?.content;
    const legacy = content?.videoRenderer;
    const lockup = content?.lockupViewModel;
    const id = legacy?.videoId ?? (lockup?.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO' ? lockup.contentId : null);
    const title = legacy?.title?.runs?.map(run => run.text).join('') ?? lockup?.metadata?.lockupMetadataViewModel?.title?.content;
    if (VIDEO_ID_PATTERN.test(id ?? '') && title) return { id, title, published: null, channelUrl: CHANNEL_HANDLE_URL };
  }
  throw new Error('videos_page_unavailable: No public videos found');
}

export async function loadLatestVideo({ fetcher = fetch, channelId } = {}) {
  try {
    return await latestFromFeed({ fetcher, channelId });
  } catch (feedError) {
    try {
      return latestFromVideosPage(await readText(`${CHANNEL_HANDLE_URL}/videos?hl=en`, fetcher));
    } catch {
      throw feedError;
    }
  }
}

/** Short, non-sensitive label for a failure, safe to return to browsers. */
export function failureReason(error) {
  const detail = error instanceof Error ? error.message : '';
  if (detail.startsWith('channel_id_unresolved')) return 'channel_id_unresolved';
  if (detail.startsWith('empty_feed')) return 'empty_feed';
  if (/HTTP \d+ for video feed/.test(detail)) return 'youtube_feed_http_error';
  if (/HTTP \d+ for channel page/.test(detail)) return 'youtube_channel_http_error';
  if (/timeout|timed out|abort/i.test(detail)) return 'youtube_timeout';
  return 'youtube_fetch_failed';
}
