import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { readIdParam, sendCaught } from '../utils/http';
import { PAGE_LIMIT, paginationMeta, parsePage } from '../utils/pagination';
import { publicThumbnailUrl } from '../utils/thumbnail';
import { getVideoModel, playableFilter } from '../utils/video';

class PornstarService {
  getPornstars = async (req: AuthRequest, res: Response) => {
    try {
      const appStyle = req.device?.appStyle || 'finance';
      const { personModel: Pornstar } = getVideoModel(appStyle);
      const page = parsePage(req.query.page);
      const skip = (page - 1) * PAGE_LIMIT;

      const [data, total] = await Promise.all([
        Pornstar.find({}, { name: 1, slug: 1 })
          .sort({ name: 1 })
          .skip(skip)
          .limit(PAGE_LIMIT)
          .lean(),
        Pornstar.countDocuments(),
      ]);

      return res.status(200).json({
        success: true,
        message: 'Pornstars fetched successfully',
        data,
        pagination: paginationMeta(page, total),
      });
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  getPornstarVideos = async (req: AuthRequest, res: Response) => {
    try {
      const id = readIdParam(req);
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pornstar id',
        });
      }

      const appStyle = req.device?.appStyle || 'finance';
      const { personModel: Pornstar, videoModel, personIdField } = getVideoModel(appStyle);

      const pornstar = await Pornstar.findById(id, { name: 1, slug: 1 }).lean();
      if (!pornstar) {
        return res.status(404).json({
          success: false,
          message: 'Pornstar not found',
        });
      }

      const page = parsePage(req.query.page);
      const skip = (page - 1) * PAGE_LIMIT;
      const filter = { ...playableFilter(appStyle), [personIdField]: pornstar._id };

      const [videos, total] = await Promise.all([
        videoModel
          .find(filter, { title: 1, slug: 1, thumbnail: 1, duration: 1 })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(PAGE_LIMIT)
          .lean(),
        videoModel.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: 'Pornstar videos fetched successfully',
        data: {
          pornstar: {
            _id: pornstar._id,
            name: pornstar.name,
            slug: pornstar.slug,
          },
          videos: videos.map((video) => ({
            ...video,
            thumbnail: publicThumbnailUrl(video.thumbnail),
          })),
        },
        pagination: paginationMeta(page, total),
      });
    } catch (error) {
      return sendCaught(res, error);
    }
  };
}

export default new PornstarService();
