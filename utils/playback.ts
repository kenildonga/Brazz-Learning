import jwt from 'jsonwebtoken';

// embed-players accepts only HS256 tokens with an exp and exactly these site/purpose claims.
const PLAYBACK_SITE = 'pornhd3x';
const PLAYBACK_PURPOSE = 'hls';
const DEFAULT_TTL_SECONDS = 4 * 60 * 60;
const MIN_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 12 * 60 * 60;
const MIN_SECRET_LENGTH = 32;

function playbackConfig() {
  const secret = process.env.PLAYBACK_JWT_SECRET;
  if (!secret || secret.trim().length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Set PLAYBACK_JWT_SECRET to a private secret of at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  if (secret === process.env.JWT_SECRET) {
    throw new Error('PLAYBACK_JWT_SECRET must differ from JWT_SECRET');
  }

  let ttlSeconds = DEFAULT_TTL_SECONDS;
  const rawTtl = process.env.PLAYBACK_TOKEN_TTL_SECONDS?.trim();
  if (rawTtl) {
    ttlSeconds = Number(rawTtl);
    if (
      !Number.isInteger(ttlSeconds) ||
      ttlSeconds < MIN_TTL_SECONDS ||
      ttlSeconds > MAX_TTL_SECONDS
    ) {
      throw new Error(
        `PLAYBACK_TOKEN_TTL_SECONDS must be an integer from ${MIN_TTL_SECONDS} to ${MAX_TTL_SECONDS}`,
      );
    }
  }

  const rawBaseUrl = process.env.PLAYER_BASE_URL?.trim();
  if (!rawBaseUrl) {
    throw new Error('Set PLAYER_BASE_URL to the player service public URL');
  }
  let url: URL;
  try {
    url = new URL(rawBaseUrl);
  } catch {
    throw new Error('PLAYER_BASE_URL must be an absolute URL');
  }
  const isLocalHttp =
    url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('PLAYER_BASE_URL must use https');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('PLAYER_BASE_URL must not contain credentials, a query or a fragment');
  }

  return { secret, ttlSeconds, baseUrl: `${url.origin}${url.pathname.replace(/\/+$/, '')}` };
}

/**
 * Signed embed-players HLS playlist URL for an adult video, or null without a slug.
 * The token only authorises the playlist request; segments load directly from the CDN.
 */
export function playbackHlsUrl(scrappedSlug: string): string | null {
  if (!scrappedSlug) return null;
  const { secret, ttlSeconds, baseUrl } = playbackConfig();
  const token = jwt.sign(
    { site: PLAYBACK_SITE, slug: scrappedSlug, purpose: PLAYBACK_PURPOSE },
    secret,
    {
      algorithm: 'HS256',
      expiresIn: ttlSeconds,
    },
  );
  return `${baseUrl}/hls/${token}/index.m3u8`;
}
