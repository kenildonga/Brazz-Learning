import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest, type AppStyle } from '../../middleware/auth';
import Device from '../../models/Device';
import { sendCaught, sendError, sendOk } from '../../utils/http';
import { PAGE_LIMIT, paginationMeta, parsePage } from '../../utils/pagination';
import { serializeDevice } from '../../utils/serialize';

class AdminDeviceService {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const page = parsePage(req.query.page);
      const skip = (page - 1) * PAGE_LIMIT;
      const [rows, total] = await Promise.all([
        Device.find().sort({ createdAt: -1 }).skip(skip).limit(PAGE_LIMIT).lean(),
        Device.countDocuments(),
      ]);
      return sendOk(
        res,
        'Devices fetched successfully',
        rows.map((row) => serializeDevice(row)),
        paginationMeta(page, total),
      );
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const rawId = req.params.id;
      const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 400, 'Invalid device id');
      }
      const appStyle = req.body.appStyle as AppStyle;
      const device = await Device.findByIdAndUpdate(
        id,
        { appStyle },
        { new: true, runValidators: true },
      ).lean();
      if (!device) return sendError(res, 404, 'Device not found');
      return sendOk(res, 'Device updated successfully', serializeDevice(device));
    } catch (error) {
      return sendCaught(res, error);
    }
  };
}

export default new AdminDeviceService();
