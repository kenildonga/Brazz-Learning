import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import Device from '../../models/Device';

class AdultService {
    getCategories = async (req: AuthRequest, res: Response) => {
        try {
            const categories = [
                {
                    _id: '67b73b02002a1b2c3d4e0001',
                    name: 'Trending Videos',
                    videoCount: 28,
                },
                {
                    _id: '67b73b02002a1b2c3d4e0002',
                    name: 'Top Rated',
                    videoCount: 45,
                },
                {
                    _id: '67b73b02002a1b2c3d4e0003',
                    name: 'Popular & Featured',
                    videoCount: 36,
                },
                {
                    _id: '67b73b02002a1b2c3d4e0004',
                    name: 'Latest Releases',
                    videoCount: 19,
                },
                {
                    _id: '67b73b02002a1b2c3d4e0005',
                    name: 'HD & 4K Quality',
                    videoCount: 52,
                },
                {
                    _id: '67b73b02002a1b2c3d4e0006',
                    name: 'Recommended For You',
                    videoCount: 23,
                },
            ];

            return res.status(200).json({
                success: true,
                message: 'Categories fetched successfully',
                data: categories,
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

export default new AdultService();