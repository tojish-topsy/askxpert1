import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ADMIN_PASSCODE } from './_lib/db.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, code: ADMIN_PASSCODE });
}
