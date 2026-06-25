/**
 * Vercel Serverless Function: POST /api/notify
 * Handles registration form submissions using pure REST APIs.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  useSupabase, useFirebase, useGoogleSheets,
  supabase,
  firestoreQuery, firestoreAdd,
  sheetsGet, sheetsUpdate, sheetsAppend,
  SHEET_RANGE, SHEET_HEADERS,
} from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const { name, email, mobile, department, yearOfStudy, isIeeeMember, ieeeId } = req.body;

  if (!name || !email || !mobile) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
  }

  const mobileRegex = /^[+]?[0-9\s\-()]{10,15}$/;
  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid mobile number.' });
  }

  try {
    const newRegistration: Record<string, any> = {
      id: `reg_${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      department: department || null,
      yearOfStudy: yearOfStudy || null,
      isIeeeMember: isIeeeMember !== undefined ? !!isIeeeMember : null,
      ieeeId: isIeeeMember ? (ieeeId || '').trim() : null,
      timestamp: new Date().toISOString(),
    };

    if (!useSupabase && !useFirebase && !useGoogleSheets) {
      throw new Error('No database configured.');
    }

    let isDuplicate = false;

    // Firebase duplicate check via REST
    if (useFirebase && !isDuplicate) {
      try {
        const emailResults = await firestoreQuery('registrations', 'email', email.trim().toLowerCase());
        const mobileResults = await firestoreQuery('registrations', 'mobile', mobile.trim());
        if (emailResults.length > 0 || mobileResults.length > 0) isDuplicate = true;
      } catch (err) {
        console.error('[AskXpert API] Firebase duplicate check failed:', err);
      }
    }

    // Supabase duplicate check
    if (useSupabase && !isDuplicate) {
      try {
        const { data: existingEmail, error: emailErr } = await supabase!.from('registrations').select('id').eq('email', email.trim().toLowerCase()).limit(1);
        if (emailErr) throw emailErr;
        const { data: existingMobile, error: mobileErr } = await supabase!.from('registrations').select('id').eq('mobile', mobile.trim()).limit(1);
        if (mobileErr) throw mobileErr;
        if ((existingEmail && existingEmail.length > 0) || (existingMobile && existingMobile.length > 0)) isDuplicate = true;
      } catch (err) {
        console.error('[AskXpert API] Supabase duplicate check failed:', err);
      }
    }

    // Google Sheets duplicate check
    if (useGoogleSheets && !isDuplicate) {
      try {
        const response = await sheetsGet(`${SHEET_RANGE}!C:D`);
        for (const row of response.values) {
          if (row[0]?.toLowerCase() === email.trim().toLowerCase() || row[1] === mobile.trim()) {
            isDuplicate = true;
            break;
          }
        }
      } catch (err) {
        console.error('[AskXpert API] Google Sheets duplicate check failed:', err);
      }
    }

    if (isDuplicate) {
      return res.status(400).json({ success: false, error: 'This email or mobile number is already registered for updates!' });
    }

    let savedToAtLeastOne = false;

    // Save to Supabase
    if (useSupabase) {
      try {
        const { error } = await supabase!.from('registrations').insert([newRegistration]);
        if (error) throw error;
        savedToAtLeastOne = true;
      } catch (err) {
        console.error('[AskXpert API] Supabase save failed:', err);
      }
    }

    // Save to Firebase via REST
    if (useFirebase) {
      try {
        await firestoreAdd('registrations', newRegistration);
        savedToAtLeastOne = true;
      } catch (err) {
        console.error('[AskXpert API] Firebase save failed:', err);
      }
    }

    // Append to Google Sheets
    if (useGoogleSheets) {
      try {
        const headerResponse = await sheetsGet(`${SHEET_RANGE}!A1:I1`);
        if (!headerResponse.values || headerResponse.values.length === 0) {
          await sheetsUpdate(`${SHEET_RANGE}!A1:I1`, [SHEET_HEADERS]);
        }

        const row = [
          newRegistration.id,
          newRegistration.name,
          newRegistration.email,
          newRegistration.mobile,
          newRegistration.department || '',
          newRegistration.yearOfStudy || '',
          newRegistration.isIeeeMember !== null ? (newRegistration.isIeeeMember ? 'Yes' : 'No') : '',
          newRegistration.ieeeId || '',
          newRegistration.timestamp,
        ];
        await sheetsAppend(SHEET_RANGE, [row]);
        savedToAtLeastOne = true;
      } catch (err) {
        console.error('[AskXpert API] Google Sheets save failed:', err);
      }
    }

    if (!savedToAtLeastOne) {
      throw new Error('Failed to save to any database.');
    }

    return res.status(200).json({ success: true, data: newRegistration });
  } catch (error) {
    console.error('Error saving registration:', error);
    return res.status(500).json({ success: false, error: 'Server error: unable to save registration.' });
  }
}
