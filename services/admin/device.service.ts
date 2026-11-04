import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest, type AppStyle } from '../../middleware/auth';
import { getAppModels } from '../../models/appModels';
import Device from '../../models/Device';
import { readIdParam, sendCaught, sendError, sendOk } from '../../utils/http';
import { PAGE_LIMIT, paginationMeta, parsePage } from '../../utils/pagination';
import { serializeDevice } from '../../utils/serialize';

type SerializedDevice = ReturnType<typeof serializeDevice>;

async function categoryNames(style: AppStyle, ids: string[]) {
  const unique = [...new Set(ids.filter((id) => mongoose.Types.ObjectId.isValid(id)))];
  const names = new Map<string, string>();
  if (!unique.length) return names;
  const rows = await getAppModels(style)
    .Category.find({ _id: { $in: unique } }, { name: 1 })
    .lean();
  for (const row of rows) {
    if (row.name) names.set(String(row._id), row.name);
  }
  return names;
}

function withCategoryNames(
  device: SerializedDevice,
  primary: Map<string, string>,
  fallback: Map<string, string>,
) {
  return {
    ...device,
    selectedCategoryNames: device.selectedCategories.flatMap((id) => {
      const name = primary.get(id) || fallback.get(id);
      return name ? [name] : [];
    }),
  };
}

async function attachCategoryNames(devices: SerializedDevice[]) {
  const ids = devices.flatMap((device) => device.selectedCategories);
  const [finance, adult] = await Promise.all([
    categoryNames('finance', ids),
    categoryNames('adult', ids),
  ]);
  return devices.map((device) =>
    device.appStyle === 'adult'
      ? withCategoryNames(device, adult, finance)
      : withCategoryNames(device, finance, adult),
  );
}

class AdminDeviceService {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const page = parsePage(req.query.page);
      const skip = (page - 1) * PAGE_LIMIT;
      const [rows, total] = await Promise.all([
        Device.find().sort({ createdAt: -1 }).skip(skip).limit(PAGE_LIMIT).lean(),
        Device.countDocuments(),
      ]);
      const devices = await attachCategoryNames(rows.map((row) => serializeDevice(row)));
      return sendOk(res, 'Devices fetched successfully', devices, paginationMeta(page, total));
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const id = readIdParam(req);
      if (!id) return sendError(res, 400, 'Invalid device id');
      const appStyle = req.body.appStyle as AppStyle;
      const device = await Device.findByIdAndUpdate(
        id,
        { appStyle },
        { new: true, runValidators: true },
      ).lean();
      if (!device) return sendError(res, 404, 'Device not found');
      const [named] = await attachCategoryNames([serializeDevice(device)]);
      return sendOk(res, 'Device updated successfully', named);
    } catch (error) {
      return sendCaught(res, error);
    }
  };
}

export default new AdminDeviceService();
