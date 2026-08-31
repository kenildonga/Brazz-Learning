import { createHash } from 'crypto';
import NodeCache from 'node-cache';

const BASE_URL = process.env.PORNHD3X_BASE_URL || 'https://www9.pornhd3x.tv';
const POST_PREFIX = '/movies/';
const REQUEST_TIMEOUT_MS = 15000;
const CACHE_TTL_SECONDS = 2 * 60 * 60;
const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const urlCache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS, useClones: false });
const inflight = new Map<string, Promise<string | null>>();

type PlayerConfig = {
    thfq: string;
    salt: string;
};

let playerConfigPromise: Promise<PlayerConfig> | null = null;

const fetchText = async (url: string, headers: Record<string, string>) => {
    const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.text();
};

const decodeKqSaTable = (fixJsSource: string) => {
    const blobMatch = fixJsSource.match(/decodeURIComponent\("([^"]+)"\)/);
    if (!blobMatch) {
        throw new Error('Could not find encoded data blob in fix.js');
    }

    const keyMatch = fixJsSource.match(/\}\('([^']+)'\)/);
    if (!keyMatch) {
        throw new Error('Could not find XOR key in fix.js');
    }

    const encodedBlob = blobMatch[1];
    const xorKey = keyMatch[1];
    const decoded = decodeURIComponent(encodedBlob);
    let result = '';
    for (let i = 0, k = 0; i < decoded.length; i++, k++) {
        if (k === xorKey.length) {
            k = 0;
        }
        result += String.fromCharCode(decoded.charCodeAt(i) ^ xorKey.charCodeAt(k));
    }

    return result.split('~|.');
};

const extractCookieConfig = (fixJsSource: string, lookupTable: string[]) => {
    const match = fixJsSource.match(/thfq6jcc6pj85tez\s*=\s*KqSa\.[A-Z]\d?\((\d+)\)/);
    if (!match) {
        throw new Error('Could not find thfq6jcc6pj85tez assignment in fix.js');
    }
    const index = parseInt(match[1], 10);
    const value = lookupTable[index];
    if (!value) {
        throw new Error('Cookie config index out of range in fix.js');
    }
    return value;
};

const extractSalt = (fixJsSource: string) => {
    const match = fixJsSource.match(/md5\(wdhr7uq9qa2h6hh3\s*\+\s*b\s*\+\s*"([^"]+)"\)/);
    if (!match) {
        throw new Error('Could not find SALT in fix.js');
    }
    return match[1];
};

const loadPlayerConfig = async (html: string, pageUrl: string) => {
    const fixJsTag = html.match(/<script[^>]+src=["']([^"']*fix\.js[^"']*)["']/i)?.[1];
    if (!fixJsTag) {
        throw new Error('fix.js script tag not found in page');
    }

    const origin = `${new URL(BASE_URL).origin}/`;
    const fixJsUrl = fixJsTag.startsWith('http') ? fixJsTag : origin + fixJsTag.replace(/^\//, '');
    const fixJsSource = await fetchText(fixJsUrl, {
        'User-Agent': USER_AGENT,
        Referer: pageUrl,
    });

    const lookupTable = decodeKqSaTable(fixJsSource);
    return {
        thfq: extractCookieConfig(fixJsSource, lookupTable),
        salt: extractSalt(fixJsSource),
    };
};

const getPlayerConfig = (html: string, pageUrl: string) => {
    if (!playerConfigPromise) {
        playerConfigPromise = loadPlayerConfig(html, pageUrl).catch((error) => {
            playerConfigPromise = null;
            throw error;
        });
    }
    return playerConfigPromise;
};

const resolveM3u8Url = async (movieId: string, scrappedSlug: string): Promise<string | null> => {
    try {
        const pageUrl = `${BASE_URL}${POST_PREFIX}${scrappedSlug}`;
        const html = await fetchText(pageUrl, {
            'User-Agent': USER_AGENT,
            Referer: BASE_URL,
        });

        const player = await getPlayerConfig(html, pageUrl);
        const random = Math.random().toString(36).substring(2, 8);
        const hash = createHash('md5').update(movieId + random + player.salt).digest('hex');
        const cookieName = player.thfq.substring(13, 37) + movieId + player.thfq.substring(40, 64);
        const origin = `${new URL(BASE_URL).origin}/`;
        const sourcesUrl = `${origin}ajax/get_sources/${movieId}/${hash}?count=1&mobile=true`;

        const response = await fetch(sourcesUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                Referer: pageUrl,
                'X-Requested-With': 'XMLHttpRequest',
                Cookie: `${cookieName}=${random}`,
            },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
            throw new Error(`get_sources HTTP ${response.status}`);
        }

        const payload = await response.json() as {
            playlist?: { sources?: { file?: string }[] }[];
        };
        const file = payload?.playlist?.[0]?.sources?.[0]?.file;
        return typeof file === 'string' && file ? file : null;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`[m3u8] failed for ${movieId}: ${message}`);
        return null;
    }
};

export const fetchM3u8Url = async (movieId: string, scrappedSlug: string): Promise<string | null> => {
    if (!movieId || !scrappedSlug) {
        return null;
    }

    const cached = urlCache.get<string>(movieId);
    if (cached) {
        return cached;
    }

    const pending = inflight.get(movieId);
    if (pending) {
        return pending;
    }

    const request = resolveM3u8Url(movieId, scrappedSlug).then((url) => {
        if (url) {
            urlCache.set(movieId, url);
        }
        return url;
    }).finally(() => {
        inflight.delete(movieId);
    });

    inflight.set(movieId, request);
    return request;
};
