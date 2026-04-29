import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../prisma/client';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const REFRESH_COOKIE = 'refreshToken';
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
} as const;

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, cookieOptions);
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid credentials', 400);

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const payload = { userId: user.id, role: user.role, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setRefreshCookie(res, refreshToken);

  const { password: _, ...userWithoutPassword } = user;
  return sendSuccess(res, { user: userWithoutPassword, accessToken });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
  }
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  return sendSuccess(res, null, 'Logged out successfully');
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) return sendError(res, 'No refresh token', 401);

  try {
    const payload = verifyRefreshToken(token);
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      return sendError(res, 'Refresh token expired', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) return sendError(res, 'User not found', 401);

    const newPayload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshCookie(res, newRefreshToken);
    return sendSuccess(res, { accessToken });
  } catch {
    return sendError(res, 'Invalid refresh token', 401);
  }
}

export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      avatar: true, role: true, department: true, position: true,
      isActive: true, createdAt: true,
    },
  });
  if (!user) return sendError(res, 'User not found', 404);
  return sendSuccess(res, { user });
}
