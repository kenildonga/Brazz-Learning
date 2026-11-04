import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Device from '../models/Device';
import { getAppModels } from '../models/appModels';
import { PAGE_LIMIT, parsePage } from '../utils/pagination';
import { countVideosByCategory, getVideoModel } from '../utils/video';

class CategoryService {
  getCategories = async (req: AuthRequest, res: Response) => {
    try {
      const appStyle = req.device?.appStyle || 'finance';
      const { categoryModel, videoModel } = getVideoModel(appStyle);
      const pageQuery = req.query.page;
      const hasPage = pageQuery !== undefined && pageQuery !== '';
      const page = parsePage(pageQuery);

      const categories = await categoryModel.find({}, { name: 1 }).lean();
      const countMap = await countVideosByCategory(
        videoModel,
        categories.map((category) => category._id),
      );

      const sorted = categories
        .map((category) => ({
          _id: category._id,
          name: category.name,
          videoCount: countMap.get(String(category._id)) || 0,
        }))
        .sort((a, b) => b.videoCount - a.videoCount || a.name.localeCompare(b.name));

      if (!hasPage) {
        return res.status(200).json({
          success: true,
          message: 'Categories fetched successfully',
          data: sorted.slice(0, PAGE_LIMIT),
        });
      }

      const total = sorted.length;
      const skip = (page - 1) * PAGE_LIMIT;

      return res.status(200).json({
        success: true,
        message: 'Categories fetched successfully',
        data: sorted.slice(skip, skip + PAGE_LIMIT),
        pagination: {
          page,
          limit: PAGE_LIMIT,
          total,
          totalPages: Math.ceil(total / PAGE_LIMIT) || 0,
        },
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
      const { categoryId: rawCategoryId, isSave } = req.body as {
        categoryId: string;
        isSave: boolean;
      };

      // Only canonical 24-hex IDs; isValid also accepts any 12-character string.
      if (!/^[a-f\d]{24}$/i.test(rawCategoryId)) {
        return res.status(400).json({ success: false, message: 'Invalid category id' });
      }
      const categoryId = rawCategoryId.toLowerCase();
      const { Category } = getAppModels(req.device!.appStyle);
      if (isSave && !(await Category.exists({ _id: categoryId }))) {
        return res
          .status(400)
          .json({ success: false, message: 'Category not found in this catalog' });
      }
      const device = await Device.findOneAndUpdate(
        {
          _id: req.device!._id,
          appUniqueId: req.device!.appUniqueId,
          appStyle: req.device!.appStyle,
        },
        isSave
          ? { $addToSet: { selectedCategories: categoryId } }
          : { $pull: { selectedCategories: categoryId } },
        { new: true, runValidators: true },
      );
      if (!device)
        return res
          .status(401)
          .json({ success: false, message: 'Device session changed; register again' });

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
