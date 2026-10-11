import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { PAGE_LIMIT, parsePage } from '../utils/pagination';
import { formatDuration } from '../utils/duration';
import { fetchM3u8Url } from '../utils/m3u8';
import { publicThumbnailUrl } from '../utils/thumbnail';
import {
  fetchForYouReels,
  parseReelsLimit,
  parseReelsPage,
  sanitizeReelsFeed,
} from '../utils/reels';
import { getStoredAdSettings } from './admin/ads.service';
import { buildAdsConfig } from '../utils/adsConfig';
import AdminReelService from './admin/reel.service';
import {
  NAME_PROJECTION,
  attachPeople,
  escapeRegex,
  getVideoModel,
  parseSearchQuery,
  toObjectIdArray,
} from '../utils/video';

const LIST_PROJECTION = {
  title: 1,
  thumbnail: 1,
  duration: 1,
  pornstarIds: 1,
  influencerIds: 1,
};
const RELATED_SIZE = 30;

class VideoService {
  getVideos = async (req: AuthRequest, res: Response) => {
    try {
      const appStyle = req.device?.appStyle || 'finance';
      const { videoModel, personModel, personIdField } = getVideoModel(appStyle);
      const page = parsePage(req.query.page);
      const skip = (page - 1) * PAGE_LIMIT;

      const [data, total] = await Promise.all([
        videoModel
          .find({}, LIST_PROJECTION)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(PAGE_LIMIT)
          .lean(),
        videoModel.countDocuments(),
      ]);

      const shuffled = data.slice();
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      return res.status(200).json({
        success: true,
        message: 'Videos fetched successfully',
        data: await attachPeople(shuffled, personModel, personIdField),
        pagination: {
          page,
          limit: PAGE_LIMIT,
          total,
          totalPages: Math.ceil(total / PAGE_LIMIT) || 0,
        },
        adsConfig: buildAdsConfig(await getStoredAdSettings()),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  };

  searchVideos = async (req: AuthRequest, res: Response) => {
    try {
      const q = parseSearchQuery(req.query.q);
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query (q) is required',
        });
      }

      const appStyle = req.device?.appStyle || 'finance';
      const { videoModel, personModel, personIdField } = getVideoModel(appStyle);
      const page = parsePage(req.query.page);
      const skip = (page - 1) * PAGE_LIMIT;
      const filter = {
        title: { $regex: escapeRegex(q), $options: 'i' },
      };

      const [data, total] = await Promise.all([
        videoModel
          .find(filter, LIST_PROJECTION)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(PAGE_LIMIT)
          .lean(),
        videoModel.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: 'Videos searched successfully',
        data: await attachPeople(data, personModel, personIdField),
        pagination: {
          page,
          limit: PAGE_LIMIT,
          total,
          totalPages: Math.ceil(total / PAGE_LIMIT) || 0,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  };

  getReels = async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseReelsLimit(req.query.limit);
      if (limit === null) {
        return res.status(400).json({
          success: false,
          message: 'Invalid limit parameter',
        });
      }

      const page = parseReelsPage(req.query.page ?? req.query.nextPage);
      const appStyle = req.device?.appStyle || 'finance';

      if (appStyle === 'adult') {
        const data = sanitizeReelsFeed(await fetchForYouReels({ limit, page }));

        return res.status(200).json({
          success: true,
          message: 'Reels fetched successfully',
          data,
        });
      }

      const currentPage = page ?? 1;
      return res.status(200).json({
        success: true,
        message: 'Reels fetched successfully',
        data: await AdminReelService.listForApp(limit, currentPage),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  };

  getVideo = async (req: AuthRequest, res: Response) => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid video id',
        });
      }

      const appStyle = req.device?.appStyle || 'finance';
      const { videoModel, categoryModel, personModel, personIdField } = getVideoModel(appStyle);

      const video = await videoModel.findById(id).lean();
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found',
        });
      }

      const categoryIds = toObjectIdArray(video.categoryIds);
      const personIds = toObjectIdArray(video[personIdField]);

      const match: Record<string, unknown> = { _id: { $ne: video._id } };
      if (categoryIds.length || personIds.length) {
        const or: Record<string, unknown>[] = [];
        if (categoryIds.length) {
          or.push({ categoryIds: { $in: categoryIds } });
        }
        if (personIds.length) {
          or.push({ [personIdField]: { $in: personIds } });
        }
        match.$or = or;
      }

      const relatedPromise = videoModel.aggregate([
        { $match: match },
        { $sample: { size: RELATED_SIZE } },
        { $project: LIST_PROJECTION },
      ]);

      const movieId = String(video.movieId || '');
      const scrappedSlug = String(video.scrappedSlug || '');
      const m3u8Promise =
        appStyle === 'adult' && movieId && scrappedSlug
          ? fetchM3u8Url(movieId, scrappedSlug)
          : Promise.resolve('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');

      const categoriesPromise = categoryIds.length
        ? categoryModel.find({ _id: { $in: categoryIds } }, NAME_PROJECTION).lean()
        : Promise.resolve([]);
      const peoplePromise = personIds.length
        ? personModel.find({ _id: { $in: personIds } }, NAME_PROJECTION).lean()
        : Promise.resolve([]);

      const [relatedVideos, m3u8, categories, peopleIds] = await Promise.all([
        relatedPromise,
        m3u8Promise,
        categoriesPromise,
        peoplePromise,
      ]);

      return res.status(200).json({
        success: true,
        message: 'Video fetched successfully',
        data: {
          video: {
            _id: video._id,
            title: video.title,
            duration: formatDuration(video.duration as number | null),
            description: video.description || '',
            movieId,
            thumbnail: publicThumbnailUrl(video.thumbnail),
            m3u8,
            categories,
            peopleIds,
          },
          relatedVideos: await attachPeople(relatedVideos, personModel, personIdField),
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  };
}

export default new VideoService();
