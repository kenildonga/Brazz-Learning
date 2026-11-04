import { Response } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { AuthRequest } from '../../middleware/auth';
import FinanceReel, { type IReelUser } from '../../models/FinanceReel';
import { readIdParam, sendCaught, sendError, sendOk, UPSTREAM_USER_AGENT } from '../../utils/http';
import { PAGE_LIMIT, paginationMeta, parsePage } from '../../utils/pagination';
import { fetchForYouReels, sanitizeReelsFeed } from '../../utils/reels';
import { serializeReel } from '../../utils/serialize';
import { escapeRegex, parseSearchQuery } from '../../utils/video';
import {
  createPlaybackTicket,
  playbackTarget,
  verifyPlaybackTicket,
} from '../../utils/reelPlayback';

function reelDoc(body: Record<string, unknown>) {
  const rawUser =
    body.user && typeof body.user === 'object' ? (body.user as Record<string, unknown>) : {};
  const displayName = String(rawUser.displayName || 'Finance');
  const username = String(
    rawUser.username || displayName.toLowerCase().replace(/\s+/g, '-') || 'finance',
  );
  const avatar = rawUser.avatar;
  const user: IReelUser = {
    id: String(rawUser.id || username),
    username,
    displayName,
    avatar: typeof avatar === 'string' && avatar ? avatar : null,
    verified: Boolean(rawUser.verified),
  };
  const tags = Array.isArray(body.tags)
    ? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  return {
    videoUrl: String(body.videoUrl || ''),
    thumbnailUrl: String(body.thumbnailUrl || ''),
    title: String(body.title || '').trim(),
    description: String(body.description || ''),
    tags,
    duration: typeof body.duration === 'number' ? body.duration : 0,
    width: typeof body.width === 'number' ? body.width : null,
    height: typeof body.height === 'number' ? body.height : null,
    userId: String(body.userId || user.id),
    user,
  };
}

class AdminReelService {
  listForApp = async (limit: number, page: number) => {
    const rows = await FinanceReel.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .lean();
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    return {
      videos: rows.map((row) => serializeReel(row)),
      nextPage: hasMore ? page + 1 : null,
      nextCursor: null,
      hasMore,
    };
  };

  list = async (req: AuthRequest, res: Response) => {
    try {
      const page = parsePage(req.query.page);
      const q = parseSearchQuery(req.query.q);
      const skip = (page - 1) * PAGE_LIMIT;

      if (req.appStyle === 'adult') {
        const feed = sanitizeReelsFeed(await fetchForYouReels({ limit: PAGE_LIMIT, page }));
        const needle = q.toLowerCase();
        const data = feed.videos
          .map((video) => serializeReel(video as object))
          .filter((reel) => {
            if (!needle) return true;
            return (
              reel.title.toLowerCase().includes(needle) ||
              reel.user.displayName.toLowerCase().includes(needle) ||
              reel.tags.some((tag) => tag.toLowerCase().includes(needle))
            );
          });
        return sendOk(res, 'Reels fetched successfully', data, {
          page,
          limit: PAGE_LIMIT,
          total: 0,
          totalPages: feed.hasMore ? page + 1 : page,
          hasMore: feed.hasMore,
        });
      }

      const pattern = q ? new RegExp(escapeRegex(q), 'i') : null;
      const filter = pattern
        ? { $or: [{ title: pattern }, { 'user.displayName': pattern }, { tags: pattern }] }
        : {};
      const [rows, total] = await Promise.all([
        FinanceReel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(PAGE_LIMIT).lean(),
        FinanceReel.countDocuments(filter),
      ]);
      return sendOk(
        res,
        'Reels fetched successfully',
        rows.map((row) => serializeReel(row)),
        paginationMeta(page, total),
      );
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  playback = async (req: AuthRequest, res: Response) => {
    let target: URL;
    try {
      target = playbackTarget(String(req.body.url));
    } catch {
      return sendError(res, 400, 'Video host is not allowed');
    }
    try {
      res.setHeader('Cache-Control', 'no-store');
      return sendOk(res, 'Playback authorized', {
        url: target.href,
        ticket: createPlaybackTicket(target),
      });
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  stream = async (req: AuthRequest, res: Response) => {
    const raw = typeof req.query.url === 'string' ? req.query.url : '';
    let target: URL;
    try {
      target = playbackTarget(raw);
    } catch {
      return sendError(res, 400, 'Invalid video url');
    }
    try {
      verifyPlaybackTicket(typeof req.query.ticket === 'string' ? req.query.ticket : '', target);
    } catch {
      return sendError(res, 401, 'Playback ticket is not valid or has expired');
    }

    const controller = new AbortController();
    const disconnect = () => controller.abort();
    res.once('close', disconnect);
    const timeout = setTimeout(disconnect, 120_000);
    try {
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      const range = req.header('range');
      const upstream = await fetch(target, {
        redirect: 'error',
        signal: controller.signal,
        headers: {
          Accept: '*/*',
          'User-Agent': UPSTREAM_USER_AGENT,
          ...(range ? { Range: range } : {}),
        },
      });
      // The timeout bounds the upstream response wait; body transfer lasts as long as the viewer stays connected.
      clearTimeout(timeout);
      res.status(upstream.status);
      for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
        const value = upstream.headers.get(name);
        if (value) res.setHeader(name, value);
      }
      if (!upstream.body) return res.end();
      await pipeline(
        Readable.fromWeb(upstream.body as unknown as import('node:stream/web').ReadableStream),
        res,
      );
    } catch (error) {
      if (res.destroyed) return;
      if (res.headersSent) {
        res.destroy();
        return;
      }
      return sendCaught(res, error);
    } finally {
      clearTimeout(timeout);
      res.off('close', disconnect);
      controller.abort();
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      if (req.appStyle !== 'finance') {
        return sendError(res, 400, 'Reels can only be created in finance mode');
      }
      const created = await FinanceReel.create(reelDoc(req.body));
      return sendOk(res, 'Reel created successfully', serializeReel(created.toObject()));
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      if (req.appStyle !== 'finance') {
        return sendError(res, 400, 'Reels can only be edited in finance mode');
      }
      const id = readIdParam(req);
      if (!id) return sendError(res, 400, 'Invalid reel id');
      const updated = await FinanceReel.findByIdAndUpdate(id, reelDoc(req.body), {
        new: true,
        runValidators: true,
      }).lean();
      if (!updated) return sendError(res, 404, 'Reel not found');
      return sendOk(res, 'Reel updated successfully', serializeReel(updated));
    } catch (error) {
      return sendCaught(res, error);
    }
  };
}

export default new AdminReelService();
