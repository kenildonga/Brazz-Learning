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
import {
  NAME_PROJECTION,
  attachPeople,
  escapeRegex,
  getVideoModel,
  mapFinanceVideoToReel,
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
const REELS_PROJECTION = {
  title: 1,
  thumbnail: 1,
  duration: 1,
  description: 1,
  categoryIds: 1,
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

      return res.status(200).json({
        success: true,
        message: 'Videos fetched successfully',
        data: await attachPeople(data, personModel, personIdField),
        pagination: {
          page,
          limit: PAGE_LIMIT,
          total,
          totalPages: Math.ceil(total / PAGE_LIMIT) || 0,
        },
        adsConfig: {
            banner_show: 2,
            native_show: 2,
            interstitial_show: 2,
            unity_game_id: '800385033',
            nativeadsplace: 4,
            blockerpopup: 1,
            blockerpopup_html: `<div style=text-align:center;padding:16px;font-family:sans-serif;font-size:15px;line-height:1.6;color:#333><p><b>Connection Settings Required</b><p>Please disable <b>Ad Blocker</b>, <b>VPN</b>, or <b>Private DNS</b> to continue using the app.<div style=text-align:left;margin-top:12px><p><b>Follow these steps:</b><ol><li>Turn off any active <b>Ad Blocker</b> app.<li>Disconnect your <b>VPN</b> if it is enabled.<li>Open <b>Settings → Network & Internet → Private DNS</b> and select <b>Automatic</b> or <b>Off</b>, if available.<li>Close and reopen the app.</ol><p style=font-size:13px;color:#666>Menu names may vary depending on your device. If the issue persists, check your network settings and try again.</div></div>`,
            google_ad_banner: 'ca-app-pub-3940256099942544/6300978111',
            google_ad_native: 'ca-app-pub-3940256099942544/2247696110',
            google_ad_interstitial: 'ca-app-pub-3940256099942544/1033173712',
            facebook_ad_banner: 'IMG_16_9_APP_INSTALL#YOUR_PLACEMENT_ID',
            facebook_ad_native: 'IMG_16_9_APP_INSTALL#YOUR_PLACEMENT_ID',
            facebook_ad_interstitial: 'IMG_16_9_APP_INSTALL#YOUR_PLACEMENT_ID',
            unity_ad_banner: 'BP_Banner_Android',
            unity_ad_native: 'BP_Banner_Android',
            unity_ad_interstitial: 'BP_Interstitial_Android'
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
