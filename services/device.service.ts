import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Device from '../models/Device';

class DeviceService {
  createDeepLink = async (_req: Request, res: Response) => {
    try {
      const token = jwt.sign({ purpose: 'join' }, process.env.JWT_SECRET || 'default_secret', {
        expiresIn: '10m',
      });
      const origin = (process.env.DEEP_LINK_ORIGIN || 'https://brazz-learning.online').replace(
        /\/$/,
        '',
      );

      return res.status(200).json({
        success: true,
        message: 'Deep link created',
        data: {
          token,
          url: `${origin}/join/${token}`,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  };

  register = async (req: Request, res: Response) => {
    try {
      const { deviceUniqueId, appUniqueId, pushToken, deepToken } = req.body as {
        deviceUniqueId: string;
        appUniqueId: string;
        pushToken?: string | null;
        deepToken?: string | null;
      };

      const joinToken = typeof deepToken === 'string' ? deepToken.trim() : '';
      let device = await Device.findOne({ deviceUniqueId });

      let joinVerified = false;
      if (joinToken) {
        try {
          const decoded = jwt.verify(joinToken, process.env.JWT_SECRET || 'default_secret');
          if (typeof decoded !== 'object' || decoded === null || decoded.purpose !== 'join') {
            return res.status(200).json({
              success: false,
              message: 'Join link is not valid',
            });
          }
        } catch (error) {
          return res.status(200).json({
            success: false,
            message:
              error instanceof jwt.TokenExpiredError
                ? 'Join link has expired'
                : 'Join link is not valid',
          });
        }
        joinVerified = true;
      }

      // Default finance. Adult only after a verified join deep link on this request.
      let appStyle: 'finance' | 'adult' = 'finance';
      if (joinVerified) {
        appStyle = 'adult';
      } else if (device && device.appUniqueId === appUniqueId) {
        appStyle = device.appStyle;
      }

      if (!device) {
        device = await Device.create({
          deviceUniqueId,
          appUniqueId,
          pushToken: pushToken || null,
          appStyle,
          selectedCategories: [],
        });
      } else if (device.appUniqueId !== appUniqueId) {
        device.appUniqueId = appUniqueId;
        device.pushToken = pushToken || null;
        device.appStyle = appStyle;
        await device.save();
      } else {
        device.pushToken = pushToken || null;
        device.appStyle = appStyle;
        await device.save();
      }

      if (!device) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create or update device',
        });
      }

      const token = jwt.sign(
        {
          deviceUniqueId: device.deviceUniqueId,
          appUniqueId: device.appUniqueId,
          _id: device._id,
          appStyle: device.appStyle,
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '3h' },
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
