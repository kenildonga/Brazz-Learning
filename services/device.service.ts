import Device from '../models/Device';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

class DeviceService {
    register = async (req: Request, res: Response) => {
        try {
            const { deviceUniqueId, appUniqueId, pushToken } = req.body as {
                deviceUniqueId: string;
                appUniqueId: string;
                pushToken?: string | null;
            };

            let device = await Device.findOne({ deviceUniqueId });

            if (!device) {
                // New device record
                device = await Device.create({
                    deviceUniqueId,
                    appUniqueId,
                    pushToken: pushToken || null,
                    appStyle: 'finance',
                    selectedCategories: [],
                });
            } else if (device.appUniqueId !== appUniqueId) {
                // Same device but different appUniqueId -> update appUniqueId, pushToken, and reset appStyle to finance
                device.appUniqueId = appUniqueId;
                device.pushToken = pushToken || null;
                device.appStyle = 'finance';
                await device.save();
            } else {
                // Same device and same appUniqueId -> only update pushToken, preserve existing appStyle
                device.pushToken = pushToken || null;
                await device.save();
            }

            if (!device) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create or update device',
                });
            }

            const token = jwt.sign(
                { deviceUniqueId: device.deviceUniqueId, appUniqueId: device.appUniqueId, _id: device._id, appStyle: device.appStyle },
                process.env.JWT_SECRET || 'default_secret',
                { expiresIn: '1h' }
            );

            return res.status(200).json({
                success: true,
                message: 'Device registered successfully',
                data: {
                    deviceId: device._id,
                    deviceUniqueId,
                    appUniqueId,
                    token,
                    appStyle: device.appStyle,
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

export default new DeviceService();
