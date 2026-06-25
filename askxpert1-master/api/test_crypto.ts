import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, msg: 'Crypto loaded', random: crypto.randomUUID() });
}
