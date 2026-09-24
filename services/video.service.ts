import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { getAppModels } from '../models/appModels';
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

const LIST_PROJECTION = { title: 1, thumbnail: 1, duration: 1 };
const FINANCE_TEST_STREAM_URL =
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/av1/1080/Big_Buck_Bunny_1080_10s_5MB.mp4';
const REELS_PROJECTION = {
  title: 1,
  thumbnail: 1,
  duration: 1,
  description: 1,
  categoryIds: 1,
  influencerIds: 1,
};
const RELATED_SIZE = 30;

const NAME_PROJECTION = { name: 1 };

const getVideoModel = (appStyle: 'finance' | 'adult') => {
  const { Video, Category, Pornstar, personIdField } = getAppModels(appStyle);
  return {
    videoModel: Video as unknown as mongoose.Model<Record<string, unknown>>,
    categoryModel: Category,
    personModel: Pornstar,
    personIdField,
  };
};

const toObjectIdArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseSearchQuery = (value: unknown) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim();
  }
  return '';
};

const mapFinanceVideoToReel = (
  video: Record<string, unknown>,
  categoryNames: string[],
  influencer: { slug?: string; name?: string } | null,
) => ({
  id: String(video._id),
  videoUrl: FINANCE_TEST_STREAM_URL,
  thumbnailUrl: publicThumbnailUrl(video.thumbnail),
  title: String(video.title || ''),
  description: String(video.description || ''),
  tags: categoryNames,
  duration: typeof video.duration === 'number' ? video.duration : 0,
  width: null,
  height: null,
  userId: influencer ? String(influencer.slug || 'finance') : 'finance',
  createdAt: video.createdAt,
  updatedAt: video.updatedAt,
  user: {
    id: influencer ? String(influencer.slug || 'finance') : 'finance',
    username: influencer?.slug || 'finance',
    displayName: influencer?.name || 'Finance',
    avatar: null,
    verified: false,
  },
});

class VideoService {
  getVideos = async (req: AuthRequest, res: Response) => {
    try {
      const appStyle = req.device?.appStyle || 'finance';
      const { videoModel } = getVideoModel(appStyle);
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

      return res.status(200).json({
        success: true,
        message: 'Videos fetched successfully',
        data: data.map((video) => ({
          ...video,
          thumbnail: publicThumbnailUrl(video.thumbnail),
        })),
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
      const { videoModel } = getVideoModel(appStyle);
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
        data: data.map((video) => ({
          ...video,
          thumbnail: publicThumbnailUrl(video.thumbnail),
        })),
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

      const { videoModel, categoryModel, personModel } = getVideoModel('finance');
      const currentPage = page ?? 1;
      const videos = await videoModel
        .find({}, REELS_PROJECTION)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * limit)
        .limit(limit + 1)
        .lean();
      const hasMore = videos.length > limit;
      if (hasMore) {
        videos.pop();
      }

      const categoryIds = [
        ...new Set(videos.flatMap((video) => toObjectIdArray(video.categoryIds).map(String))),
      ];
      const influencerIds = [
        ...new Set(videos.flatMap((video) => toObjectIdArray(video.influencerIds).map(String))),
      ];

      const [categories, influencers] = await Promise.all([
        categoryIds.length
          ? categoryModel.find({ _id: { $in: categoryIds } }, { name: 1 }).lean()
          : Promise.resolve([]),
        influencerIds.length
          ? personModel.find({ _id: { $in: influencerIds } }, { name: 1, slug: 1 }).lean()
          : Promise.resolve([]),
      ]);

      const categoryMap = new Map(
        categories.map((category) => [String(category._id), String(category.name || '')]),
      );
      const influencerMap = new Map(
        influencers.map((influencer) => [
          String(influencer._id),
          { slug: String(influencer.slug || ''), name: String(influencer.name || '') },
        ]),
      );

      const mappedVideos = videos.map((video) => {
        const videoCategoryIds = toObjectIdArray(video.categoryIds).map(String);
        const categoryNames = videoCategoryIds
          .map((id) => categoryMap.get(id))
          .filter((name): name is string => Boolean(name));
        const firstInfluencerId = toObjectIdArray(video.influencerIds)[0];
        const influencer = firstInfluencerId
          ? influencerMap.get(String(firstInfluencerId)) || null
          : null;

        return mapFinanceVideoToReel(video, categoryNames, influencer);
      });

      return res.status(200).json({
        success: true,
        message: 'Reels fetched successfully',
        data: {
          videos: mappedVideos,
          nextPage: hasMore ? currentPage + 1 : null,
          nextCursor: null,
          hasMore,
        },
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
          relatedVideos: relatedVideos.map((related) => ({
            ...related,
            thumbnail: publicThumbnailUrl(related.thumbnail),
          })),
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
