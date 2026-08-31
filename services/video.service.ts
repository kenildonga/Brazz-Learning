import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { getAppModels } from '../models/appModels';
import { PAGE_LIMIT, parsePage } from '../utils/pagination';
import { formatDuration } from '../utils/duration';
import { fetchM3u8Url } from '../utils/m3u8';

const LIST_PROJECTION = { title: 1, thumbnail: 1, duration: 1 };
const RELATED_SIZE = 30;

const getVideoModel = (appStyle: 'finance' | 'adult') => {
    const { Video, personIdField } = getAppModels(appStyle);
    return {
        videoModel: Video as unknown as mongoose.Model<Record<string, unknown>>,
        personIdField,
    };
};

const toObjectIdArray = (value: unknown) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
};

class VideoService {
    getVideos = async (req: AuthRequest, res: Response) => {
        try {
            const appStyle = req.device?.appStyle || 'finance';
            const { videoModel } = getVideoModel(appStyle);
            const page = parsePage(req.query.page);
            const skip = (page - 1) * PAGE_LIMIT;

            const [data, total] = await Promise.all([
                videoModel.find({}, LIST_PROJECTION).sort({ createdAt: -1 }).skip(skip).limit(PAGE_LIMIT).lean(),
                videoModel.countDocuments(),
            ]);

            return res.status(200).json({
                success: true,
                message: 'Videos fetched successfully',
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
            const { videoModel, personIdField } = getVideoModel(appStyle);

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
                    : Promise.resolve(null);

            const [relatedVideos, m3u8] = await Promise.all([relatedPromise, m3u8Promise]);

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
                        thumbnail: video.thumbnail || '',
                        m3u8,
                    },
                    relatedVideos,
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
