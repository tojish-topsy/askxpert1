import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, msg: 'Supabase loaded' });
}
