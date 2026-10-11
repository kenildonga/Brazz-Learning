import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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

export const tokenValidation = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('token') || req.header('authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided, authorization denied',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as {
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
      return res.status(401).json({
        success: false,
        message: 'Token is not valid or has expired',
      });
    }

    req.device = {
      deviceUniqueId: decoded.deviceUniqueId,
      appUniqueId: decoded.appUniqueId,
      _id: decoded._id,
      appStyle: decoded.appStyle === 'adult' ? 'adult' : 'finance',
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Token is not valid or has expired',
    });
  }
};

export const adminTokenValidation = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('token') || req.header('authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided, authorization denied',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as {
      sub?: string;
      email?: string;
      role?: string;
      type?: string;
    };

    if (decoded.type !== 'admin' || decoded.role !== 'admin' || !decoded.sub) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid or has expired',
      });
    }

    req.admin = {
      id: decoded.sub,
      email: decoded.email || '',
      role: 'admin',
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Token is not valid or has expired',
    });
  }
};
