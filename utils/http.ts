import { Response } from 'express';

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
  if (error && typeof error === 'object' && (error as { code?: number }).code === 11000) {
    const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
    const field = keyPattern ? Object.keys(keyPattern)[0] : 'value';
    return sendError(res, 409, `${field || 'value'} already exists`);
  }
  const message = error instanceof Error ? error.message : 'Internal server error';
  return sendError(res, 500, message || 'Internal server error');
}
