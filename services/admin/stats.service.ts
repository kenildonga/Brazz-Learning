import { Response } from 'express';
import { AuthRequest, type AppStyle } from '../../middleware/auth';
import Device from '../../models/Device';
import { getAppModels } from '../../models/appModels';
import { sendCaught, sendOk } from '../../utils/http';

class AdminStatsService {
  get = async (req: AuthRequest, res: Response) => {
    try {
      const appStyle = req.appStyle as AppStyle;
      const { Category, Video, Pornstar } = getAppModels(appStyle);
      const [categories, videos, people, devices] = await Promise.all([
        Category.countDocuments(),
        Video.countDocuments(),
        Pornstar.countDocuments(),
        Device.countDocuments(),
      ]);

      return sendOk(res, 'Stats fetched successfully', {
        categories,
        videos,
        people,
        devices,
        appStyle,
      });
    } catch (error) {
      return sendCaught(res, error);
    }
  };
}

export default new AdminStatsService();
