import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import Device from '../../models/Device';

class FinanceService {
    getCategories = async (req: AuthRequest, res: Response) => {
        try {
            const categories = [
                {
                    _id: '67b73a01001a1b2c3d4e0001',
                    name: 'Stock Market Basics',
                    videoCount: 15,
                },
                {
                    _id: '67b73a01001a1b2c3d4e0002',
                    name: 'Cryptocurrency & Blockchain',
                    videoCount: 12,
                },
                {
                    _id: '67b73a01001a1b2c3d4e0003',
                    name: 'Personal Finance & Budgeting',
                    videoCount: 20,
                },
                {
                    _id: '67b73a01001a1b2c3d4e0004',
                    name: 'Real Estate Investing',
                    videoCount: 8,
                },
                {
                    _id: '67b73a01001a1b2c3d4e0005',
                    name: 'Mutual Funds & ETFs',
                    videoCount: 10,
                },
                {
                    _id: '67b73a01001a1b2c3d4e0006',
                    name: 'Tax Planning & Strategies',
                    videoCount: 6,
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

    getSelectedCategories = async (req: AuthRequest, res: Response) => {
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

export default new FinanceService();

