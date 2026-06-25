/**
 * Vercel Serverless Function: GET /api/admin/registrations
 * Fetches all registrations (admin protected) using pure REST APIs.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  useSupabase, useFirebase, useGoogleSheets,
  supabase,
  firestoreGetAll,
  sheetsGet, SHEET_RANGE,
  ADMIN_PASSCODE,
} from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const passcode = req.headers['x-admin-passcode'] || req.query.passcode;

  if (passcode !== ADMIN_PASSCODE) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid passcode.' });
  }

  try {
    let registrations: any[] = [];

    if (useSupabase) {
      const { data, error } = await supabase!.from('registrations').select('*');
      if (error) throw error;
      registrations = data || [];
    } else if (useFirebase) {
      const docs = await firestoreGetAll('registrations');
      registrations = docs.map(({ _docPath, ...rest }) => rest);
    } else if (useGoogleSheets) {
      const response = await sheetsGet(`${SHEET_RANGE}!A:I`);
      const rows = response.values;
      registrations = rows.slice(1).map((row: string[]) => ({
        id: row[0] || '',
        name: row[1] || '',
        email: row[2] || '',
        mobile: row[3] || '',
        department: row[4] || null,
        yearOfStudy: row[5] || null,
        isIeeeMember: row[6] === 'Yes' ? true : row[6] === 'No' ? false : null,
        ieeeId: row[7] || null,
        timestamp: row[8] || '',
      }));
    } else {
      throw new Error('No database configured.');
    }

    return res.status(200).json({ success: true, data: registrations });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return res.status(500).json({ success: false, error: 'Server error: unable to fetch registrations.' });
  }
}
