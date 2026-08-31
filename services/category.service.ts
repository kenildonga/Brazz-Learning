import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Device from '../models/Device';
import { getAppModels } from '../models/appModels';

class CategoryService {
    getCategories = async (req: AuthRequest, res: Response) => {
        try {
            const appStyle = req.device?.appStyle || 'finance';
            const { Category, Video } = getAppModels(appStyle);

            const categories = await Category.find({}, { name: 1 }).lean();
            const categoryIds = categories.map((category) => category._id);

            const countMap = new Map<string, number>();
            if (categoryIds.length) {
                try {
                    const counts = await Video.aggregate([
                        { $match: { categoryIds: { $in: categoryIds } } },
                        { $unwind: '$categoryIds' },
                        { $match: { categoryIds: { $in: categoryIds } } },
                        { $group: { _id: '$categoryIds', count: { $sum: 1 } } },
                    ]).option({ maxTimeMS: 10000 });

                    for (const row of counts) {
                        countMap.set(String(row._id), row.count);
                    }
                } catch {
                    // Counts are optional; still return categories so the client is not left hanging.
                }
            }

            const data = categories.map((category) => ({
                _id: category._id,
                name: category.name,
                videoCount: countMap.get(String(category._id)) || 0,
            }));

            return res.status(200).json({
                success: true,
                message: 'Categories fetched successfully',
                data,
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    };

    saveCategories = async (req: AuthRequest, res: Response) => {
        try {
            const { categoryId, isSave } = req.body as {
                categoryId: string;
                isSave: boolean;
            };

            const deviceId = req.device?._id;
            const deviceUniqueId = req.device?.deviceUniqueId;

            const device = await Device.findOne({
                ...(deviceId ? { _id: deviceId } : { deviceUniqueId }),
            });

            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found',
                });
            }

            const currentCategories = device.selectedCategories || [];

            if (isSave) {
                if (!currentCategories.includes(categoryId)) {
                    device.selectedCategories = [...currentCategories, categoryId];
                }
            } else {
                device.selectedCategories = currentCategories.filter((id) => id !== categoryId);
            }

            await device.save();

            return res.status(200).json({
                success: true,
                message: isSave ? 'Category saved successfully' : 'Category removed successfully',
                data: {
                    deviceId: device._id,
                    deviceUniqueId: device.deviceUniqueId,
                    appUniqueId: device.appUniqueId,
                    appStyle: device.appStyle,
                    selectedCategories: device.selectedCategories,
                },
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    };

    getSavedCategories = async (req: AuthRequest, res: Response) => {
        try {
            const deviceId = req.device?._id;
            const deviceUniqueId = req.device?.deviceUniqueId;

            const device = await Device.findOne({
                ...(deviceId ? { _id: deviceId } : { deviceUniqueId }),
            });

            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Selected categories fetched successfully',
                data: {
                    selectedCategories: device.selectedCategories || [],
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

export default new CategoryService();
