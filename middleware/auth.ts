import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Admin from '../models/Admin';
import { signingSecret } from '../utils/token';

export type AppStyle = 'finance' | 'adult';

export interface AdminAuth {
  id: string;
  email: string;
  role: 'admin';
}

export interface AuthRequest extends Request {
  device?: {
    deviceUniqueId: string;
    appUniqueId: string;
    _id: string;
    appStyle: AppStyle;
  };
  admin?: AdminAuth;
  appStyle?: AppStyle;
}

export const requireAppStyle = (req: AuthRequest, res: Response, next: NextFunction) => {
  const queryStyle = Array.isArray(req.query.appStyle) ? req.query.appStyle[0] : req.query.appStyle;
  const headerStyle = req.header('x-app-style');
  const style =
    queryStyle === 'finance' || queryStyle === 'adult'
      ? queryStyle
      : headerStyle === 'finance' || headerStyle === 'adult'
        ? headerStyle
        : null;
  if (!style) {
    return res.status(400).json({
      success: false,
      message: 'appStyle must be finance or adult',
    });
  }
  req.appStyle = style;
  next();
};

export const apiKeyValidation = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('api-key');

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      message: !apiKey ? 'No API key provided, authorization denied' : 'Invalid API key',
    });
  }

  next();
};

/** Session token from the `token` header or `Authorization: Bearer …`. */
const readToken = (req: Request) =>
  req.header('token') || req.header('authorization')?.replace(/^Bearer /, '');

const sendNoToken = (res: Response) =>
  res.status(401).json({ success: false, message: 'No token provided, authorization denied' });

const sendInvalidToken = (res: Response) =>
  res.status(401).json({ success: false, message: 'Token is not valid or has expired' });

// A JWT failure means the session is invalid; anything else (such as the database) is temporary.
const sendVerifyFailure = (res: Response, error: unknown) =>
  error instanceof jwt.JsonWebTokenError
    ? sendInvalidToken(res)
    : res.status(503).json({ success: false, message: 'Could not verify session. Please retry.' });

export const tokenValidation = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = readToken(req);
  if (!token) return sendNoToken(res);

  try {
    const decoded = jwt.verify(token, signingSecret(), { algorithms: ['HS256'] }) as {
      deviceUniqueId?: string;
      appUniqueId?: string;
      _id?: string;
      appStyle?: AppStyle;
      type?: string;
    };

    if (
      decoded.type === 'admin' ||
      !decoded.deviceUniqueId ||
      !decoded.appUniqueId ||
      !decoded._id
    ) {
      return sendInvalidToken(res);
    }

    req.device = {
      deviceUniqueId: decoded.deviceUniqueId,
      appUniqueId: decoded.appUniqueId,
      _id: decoded._id,
      appStyle: decoded.appStyle === 'adult' ? 'adult' : 'finance',
    };
    next();
  } catch (error) {
    return sendVerifyFailure(res, error);
  }
};

export const adminTokenValidation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = readToken(req);
  if (!token) return sendNoToken(res);

  try {
    const decoded = jwt.verify(token, signingSecret(), { algorithms: ['HS256'] }) as {
      sub?: string;
      sessionVersion?: number;
      email?: string;
      role?: string;
      type?: string;
    };

    if (
      decoded.type !== 'admin' ||
      decoded.role !== 'admin' ||
      !decoded.sub ||
      !mongoose.Types.ObjectId.isValid(decoded.sub) ||
      !Number.isInteger(decoded.sessionVersion)
    ) {
      return sendInvalidToken(res);
    }

    const admin = await Admin.findById(decoded.sub).lean();
    if (
      !admin ||
      admin.role !== 'admin' ||
      (admin.sessionVersion ?? 0) !== decoded.sessionVersion
    ) {
      return res.status(401).json({ success: false, message: 'Admin session is no longer valid' });
    }
    req.admin = { id: String(admin._id), email: admin.email, role: 'admin' };
    next();
  } catch (error) {
    return sendVerifyFailure(res, error);
  }
};
