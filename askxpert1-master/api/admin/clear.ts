/**
 * Vercel Serverless Function: POST /api/admin/clear
 * Clears all registrations (admin protected) using pure REST APIs.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  useSupabase, useFirebase, useGoogleSheets,
  supabase,
  firestoreGetAll, firestoreDelete,
  sheetsGet, sheetsClear, SHEET_RANGE,
  ADMIN_PASSCODE,
} from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const { passcode } = req.body;

  if (passcode !== ADMIN_PASSCODE) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid passcode.' });
  }

  try {
    if (!useSupabase && !useFirebase && !useGoogleSheets) {
      throw new Error('No database configured.');
    }

    if (useSupabase) {
      const { error } = await supabase!.from('registrations').delete().neq('id', 'dummy_value_to_delete_all');
      if (error) throw error;
    }

    if (useFirebase) {
      const docs = await firestoreGetAll('registrations');
      await Promise.all(docs.map((doc: any) => firestoreDelete(doc._docPath)));
    }

    if (useGoogleSheets) {
      const response = await sheetsGet(`${SHEET_RANGE}!A:A`);
      const totalRows = response.values?.length || 0;
      if (totalRows > 1) {
        await sheetsClear(`${SHEET_RANGE}!A2:I${totalRows}`);
      }
    }

    return res.status(200).json({ success: true, message: 'All registrations cleared.' });
  } catch (error) {
    console.error('Error clearing registrations:', error);
    return res.status(500).json({ success: false, error: 'Server error: unable to clear registrations.' });
  }
}
