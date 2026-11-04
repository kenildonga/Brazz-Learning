import { UPSTREAM_USER_AGENT } from './http';

const BASE_URL = process.env.PORNREELS_BASE_URL || 'https://pornreels.tv';
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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

const sanitizeReelVideo = (video: Record<string, unknown>) => {
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

/** A positive integer from a query value (first item of an array), or undefined. */
export const parseReelsPage = (value: unknown): number | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : undefined;
};

export const parseReelsLimit = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_LIMIT;
  }
  const parsed = parseReelsPage(value);
  return parsed === undefined ? null : Math.min(parsed, MAX_LIMIT);
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
      'User-Agent': UPSTREAM_USER_AGENT,
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
