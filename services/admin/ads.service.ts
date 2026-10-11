import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import AppSettings from '../../models/AppSettings';
import { defaultAdSettings, normalizeAdSettings, type AdSettings } from '../../utils/adsConfig';
import { sendCaught, sendOk } from '../../utils/http';

const ADS_KEY = 'ads';

export async function getStoredAdSettings(): Promise<AdSettings> {
  const existing = await AppSettings.findOne({ key: ADS_KEY }).lean();
  if (existing?.value) {
    return normalizeAdSettings(existing.value);
  }
  const created = await AppSettings.create({
    key: ADS_KEY,
    value: { ...defaultAdSettings(), updatedAt: new Date().toISOString() },
  });
  return normalizeAdSettings(created.value);
}

class AdminAdsService {
  get = async (_req: AuthRequest, res: Response) => {
    try {
      return sendOk(res, 'Ad settings fetched successfully', await getStoredAdSettings());
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const next = normalizeAdSettings({
        ...req.body,
        updatedAt: new Date().toISOString(),
      });
      const saved = await AppSettings.findOneAndUpdate(
        { key: ADS_KEY },
        { key: ADS_KEY, value: next },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean();
      return sendOk(
        res,
        'Ad settings updated successfully',
        normalizeAdSettings(saved?.value ?? next),
      );
    } catch (error) {
      return sendCaught(res, error);
    }
  };
}

export default new AdminAdsService();
