import Device from '../models/Device';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

class DeviceService {
    register = async (req: Request, res: Response) => {
        try {
            const { deviceUnieqId, pushToken } = req.body as {
                deviceUnieqId: string;
                pushToken: string;
            };

            const device = await Device.findOneAndUpdate(
                { deviceUnieqId },
                { pushToken },
                { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
            );

            if (!device) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create or update device',
                });
            }

            const token = jwt.sign(
                { deviceUnieqId: device.deviceUnieqId, _id: device._id },
                process.env.JWT_SECRET || 'default_secret',
                { expiresIn: '1h' }
            );

            return res.status(200).json({
                success: true,
                message: 'Device registered successfully',
                data: {
                    deviceId: device._id,
                    deviceUnieqId,
                    token,
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
