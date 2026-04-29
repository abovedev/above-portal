import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message?: string, status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function sendError(res: Response, error: string, status = 400, code?: string) {
  return res.status(status).json({ success: false, error, code });
}
