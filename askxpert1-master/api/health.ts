/**
 * Diagnostic endpoint to test if Vercel serverless functions work at all.
 * GET /api/health
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const envCheck = {
    hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasFirebaseApiKey: !!process.env.FIREBASE_API_KEY,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_KEY,
    hasGoogleSheetsId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    hasGoogleServiceEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasGooglePrivateKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json({ success: true, message: 'Function is alive', env: envCheck });
}
