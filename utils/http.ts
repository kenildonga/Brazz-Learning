import { Request, Response } from 'express';
import mongoose from 'mongoose';

// Browser-like agent sent to the upstream video sites.
export const UPSTREAM_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** The :id route parameter when it is a valid ObjectId, otherwise null. */
export function readIdParam(req: Request) {
  const raw = req.params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return id;
}

export function sendOk(
  res: Response,
  message: string,
  data: unknown,
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore?: boolean;
  },
) {
  return res.status(200).json({
    success: true,
    message,
    data,
    ...(pagination ? { pagination } : {}),
  });
}

export function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}

export function sendCaught(res: Response, error: unknown) {
  const mongoError = error as { code?: number; keyPattern?: Record<string, unknown> } | null;
  if (mongoError?.code === 11000) {
    const field = mongoError.keyPattern ? Object.keys(mongoError.keyPattern)[0] : 'value';
    return sendError(res, 409, `${field || 'value'} already exists`);
  }
  const message = error instanceof Error && error.message ? error.message : 'Internal server error';
  return sendError(res, 500, message);
}
