import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { getAppModels } from '../models/appModels';
import { PAGE_LIMIT, parsePage } from '../utils/pagination';

class PornstarService {
    getPornstars = async (req: AuthRequest, res: Response) => {
        try {
            const appStyle = req.device?.appStyle || 'finance';
            const { Pornstar } = getAppModels(appStyle);
            const page = parsePage(req.query.page);
            const skip = (page - 1) * PAGE_LIMIT;

            const [data, total] = await Promise.all([
                Pornstar.find({}, { name: 1, slug: 1 }).sort({ name: 1 }).skip(skip).limit(PAGE_LIMIT).lean(),
                Pornstar.countDocuments(),
            ]);

            return res.status(200).json({
                success: true,
                message: 'Pornstars fetched successfully',
                data,
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

    getPornstarVideos = async (req: AuthRequest, res: Response) => {
        try {
            const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];

            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pornstar id',
                });
            }

            const appStyle = req.device?.appStyle || 'finance';
            const { Pornstar, Video, personIdField } = getAppModels(appStyle);
            const videoModel = Video as unknown as mongoose.Model<Record<string, unknown>>;

            const pornstar = await Pornstar.findById(id, { name: 1, slug: 1 }).lean();
            if (!pornstar) {
                return res.status(404).json({
                    success: false,
                    message: 'Pornstar not found',
                });
            }

            const page = parsePage(req.query.page);
            const skip = (page - 1) * PAGE_LIMIT;
            const filter = { [personIdField]: pornstar._id };

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
                    videos,
                },
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
}

export default new PornstarService();
