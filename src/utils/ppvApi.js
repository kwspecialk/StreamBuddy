// ppv.st public API client: https://api.ppv.st/api/streams
const PPV_STREAMS_URL = 'https://api.ppv.st/api/streams';
const POPULAR_COUNT = 12;

const toSource = (stream) => ({
  embedUrl: stream.iframe,
  label: stream.source_tag || stream.tag || ''
});

// always_live channels have zero or stale start/end times, so check that flag first
const isLiveNow = (stream, nowSeconds) =>
  Boolean(stream.always_live) || (stream.starts_at <= nowSeconds && nowSeconds <= stream.ends_at);

// Convert a ppv.st stream into the match shape the UI uses
const toMatch = (stream) => ({
  id: stream.id,
  title: stream.name,
  category: stream.category_name?.toLowerCase().replace(/\s+/g, '-'),
  poster: stream.poster,
  isLive: true,
  popular: false,
  viewers: Number(stream.viewers) || 0,
  sources: [stream, ...(stream.substreams || [])].filter(s => s.iframe).map(toSource)
});

export const parseLiveMatches = (data, nowSeconds = Date.now() / 1000) => {
  const uniqueMatches = new Map();

  (data?.streams || []).forEach(category => {
    (category.streams || []).forEach(stream => {
      if (isLiveNow(stream, nowSeconds) && !uniqueMatches.has(stream.id)) {
        uniqueMatches.set(stream.id, toMatch(stream));
      }
    });
  });

  return Array.from(uniqueMatches.values())
    .filter(match => match.sources.length > 0)
    .sort((a, b) => b.viewers - a.viewers)
    .map((match, index) => ({ ...match, popular: index < POPULAR_COUNT }));
};

export const fetchLiveMatches = async () => {
  const response = await fetch(PPV_STREAMS_URL);
  if (!response.ok) {
    throw new Error(`ppv.st responded with status: ${response.status}`);
  }
  return parseLiveMatches(await response.json());
};

// Build a readable title from an embed URL, e.g. /embed/nfl-redzone-31494_540p -> Nfl Redzone
export const formatEmbedTitle = (url) => {
  const slug = url.match(/\/embed\/([^?]+)/)?.[1];
  if (!slug || url.includes('vidsrc') || url.includes('2embed')) return url;

  return slug.split('/').pop()
    .replace(/_\d+p$/, '')
    .replace(/-\d+$/, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
