import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    device?: {
        deviceUniqueId: string;
        appUniqueId?: string;
        _id: string;
    };
}

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
            deviceUniqueId: string;
            _id: string;
        };

        req.device = decoded;
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: 'Token is not valid or has expired',
        });
    }
};
