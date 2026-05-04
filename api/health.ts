import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({ ok: true, env: !!process.env.DATABASE_URL });
}
