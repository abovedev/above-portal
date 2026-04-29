import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return sendError(res, 'Invalid or expired token', 401, 'TOKEN_EXPIRED');
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      return sendError(res, 'Admin access required', 403, 'FORBIDDEN');
    }
    next();
  });
}
