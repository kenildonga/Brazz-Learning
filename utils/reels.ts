const BASE_URL = process.env.PORNREELS_BASE_URL || 'https://pornreels.tv';
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type ReelsFeedResponse = {
  videos: unknown[];
  nextPage: number | null;
  nextCursor: string | null;
  hasMore: boolean;
};

const OMITTED_VIDEO_KEYS = [
  'thumbhash',
  'views',
  'status',
  'sourceUrl',
  'isScraped',
  '_count',
  'stats',
  '_algorithmScore',
] as const;

export const sanitizeReelVideo = (video: Record<string, unknown>) => {
  const sanitized = { ...video };
  for (const key of OMITTED_VIDEO_KEYS) {
    delete sanitized[key];
  }
  return sanitized;
};

export const sanitizeReelsFeed = (feed: ReelsFeedResponse): ReelsFeedResponse => ({
  ...feed,
  videos: feed.videos.map((video) =>
    sanitizeReelVideo(video && typeof video === 'object' ? (video as Record<string, unknown>) : {}),
  ),
});

export const parseReelsLimit = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_LIMIT;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.min(parsed, MAX_LIMIT);
};

export const parseReelsPage = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
};

export const fetchForYouReels = async ({
  limit,
  page,
}: {
  limit: number;
  page?: number;
}): Promise<ReelsFeedResponse> => {
  const searchParams = new URLSearchParams();
  searchParams.set('limit', String(limit));
  if (page !== undefined) {
    searchParams.set('page', String(page));
  }

  const response = await fetch(`${BASE_URL}/api/feed/for-you?${searchParams}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      Referer: `${BASE_URL}/`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Upstream returned HTTP ${response.status}`);
  }

  return response.json() as Promise<ReelsFeedResponse>;
};
