import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import prisma from '../prisma/client';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user?.isActive) {
      return sendError(res, 'Invalid or expired token', 401, 'TOKEN_EXPIRED');
    }
    req.user = { userId: user.id, role: user.role, email: user.email };
    next();
  } catch {
    return sendError(res, 'Invalid or expired token', 401, 'TOKEN_EXPIRED');
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      return sendError(res, 'Admin access required', 403, 'FORBIDDEN');
    }
    next();
  });
}
