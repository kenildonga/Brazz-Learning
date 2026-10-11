import { Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { AuthRequest } from '../../middleware/auth';
import Admin from '../../models/Admin';
import { sendCaught, sendError, sendOk } from '../../utils/http';
import { hashPassword, verifyPassword } from '../../utils/password';
import { serializeAdmin } from '../../utils/serialize';

class AdminAuthService {
  login = async (req: AuthRequest, res: Response) => {
    try {
      const email = String(req.body.email || '')
        .trim()
        .toLowerCase();
      const password = String(req.body.password || '');
      const admin = await Admin.findOne({ email }).select('+passwordHash');
      if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
        return sendError(res, 401, 'Invalid email or password');
      }

      return sendOk(res, 'Logged in successfully', {
        token: jwt.sign(
          { sub: String(admin._id), email: admin.email, role: 'admin', type: 'admin' },
          process.env.JWT_SECRET || 'default_secret',
          { expiresIn: '7d' },
        ),
        user: serializeAdmin(admin.toObject()),
      });
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  me = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.admin?.id || !mongoose.Types.ObjectId.isValid(req.admin.id)) {
        return sendError(res, 401, 'Token is not valid or has expired');
      }
      const admin = await Admin.findById(req.admin.id).lean();
      if (!admin) return sendError(res, 401, 'Token is not valid or has expired');
      return sendOk(res, 'Profile fetched successfully', serializeAdmin(admin));
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.admin?.id || !mongoose.Types.ObjectId.isValid(req.admin.id)) {
        return sendError(res, 401, 'Token is not valid or has expired');
      }
      const name = String(req.body.name || '').trim();
      const email = String(req.body.email || '')
        .trim()
        .toLowerCase();
      const admin = await Admin.findByIdAndUpdate(
        req.admin.id,
        { name, email },
        { new: true, runValidators: true },
      ).lean();
      if (!admin) return sendError(res, 401, 'Token is not valid or has expired');
      return sendOk(res, 'Profile updated successfully', serializeAdmin(admin));
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  changePassword = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.admin?.id || !mongoose.Types.ObjectId.isValid(req.admin.id)) {
        return sendError(res, 401, 'Token is not valid or has expired');
      }
      const currentPassword = String(req.body.currentPassword || '');
      const newPassword = String(req.body.newPassword || '');
      const admin = await Admin.findById(req.admin.id).select('+passwordHash');
      if (!admin) return sendError(res, 401, 'Token is not valid or has expired');
      if (!(await verifyPassword(currentPassword, admin.passwordHash))) {
        return sendError(res, 400, 'Current password is incorrect');
      }
      admin.passwordHash = await hashPassword(newPassword);
      await admin.save();
      return sendOk(res, 'Password updated successfully', null);
    } catch (error) {
      return sendCaught(res, error);
    }
  };
}

export default new AdminAuthService();
