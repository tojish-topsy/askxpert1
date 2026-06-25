/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// Load environment variables
dotenv.config();

// Express setup
const app = express();
const PORT = 3000;

// Resolve __dirname since we may run in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database Selection
const useSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_KEY;
const useFirebase = !!process.env.FIREBASE_PROJECT_ID;
const useGoogleSheets = !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID && !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

let supabase: any = null;
if (useSupabase) {
  supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_KEY as string);
  console.log('[AskXpert Server] Supabase initialized');
}

let registrationsCollection: any = null;
if (useFirebase) {
  const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    appId: process.env.FIREBASE_APP_ID,
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  };

  const firebaseApp = initializeApp(firebaseConfig);
  const db = process.env.FIREBASE_FIRESTORE_DATABASE_ID
    ? getFirestore(firebaseApp, process.env.FIREBASE_FIRESTORE_DATABASE_ID)
    : getFirestore(firebaseApp);

  registrationsCollection = collection(db, 'registrations');
  console.log('[AskXpert Server] Firebase initialized');
}

// Google Sheets Integration
let sheetsClient: any = null;
let spreadsheetId: string = '';
const SHEET_RANGE = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1';
const SHEET_HEADERS = ['ID', 'Name', 'Email', 'Mobile', 'Department', 'Year of Study', 'IEEE Member', 'IEEE ID', 'Timestamp'];

if (useGoogleSheets) {
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
    spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID as string;
    console.log('[AskXpert Server] Google Sheets initialized');

    // Ensure the header row exists
    (async () => {
      try {
        const response = await sheetsClient.spreadsheets.values.get({
          spreadsheetId,
          range: `${SHEET_RANGE}!A1:I1`,
        });
        if (!response.data.values || response.data.values.length === 0) {
          await sheetsClient.spreadsheets.values.update({
            spreadsheetId,
            range: `${SHEET_RANGE}!A1:I1`,
            valueInputOption: 'RAW',
            requestBody: { values: [SHEET_HEADERS] },
          });
          console.log('[AskXpert Server] Google Sheets header row created');
        }
      } catch (err) {
        console.error('[AskXpert Server] Failed to initialize sheet headers:', err);
      }
    })();
  } catch (err) {
    console.error('[AskXpert Server] Failed to initialize Google Sheets:', err);
  }
}

if (!useSupabase && !useFirebase && !useGoogleSheets) {
  console.warn('[AskXpert Server] WARNING: No database configured!');
}

// Passcode to secure the admin panel
const ADMIN_PASSCODE = 'IEEECEK2026';

// Middleware
app.use(express.json());

// API Routes
// 1. Submit a notification request (Public)
app.post('/api/notify', async (req, res) => {
  const { name, email, mobile, department, yearOfStudy, isIeeeMember, ieeeId } = req.body;

  // Basic validation
  if (!name || !email || !mobile) {
    res.status(400).json({ success: false, error: 'All fields are required.' });
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    return;
  }

  // Validate mobile format
  const mobileRegex = /^[+]?[0-9\s\-()]{10,15}$/;
  if (!mobileRegex.test(mobile)) {
    res.status(400).json({ success: false, error: 'Please enter a valid mobile number.' });
    return;
  }

  try {
    // Create new registration object
    const newRegistration = {
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

    if (useFirebase) {
      try {
        const emailQuery = query(registrationsCollection, where('email', '==', email.trim().toLowerCase()));
        const emailSnapshot = await getDocs(emailQuery);
        const mobileQuery = query(registrationsCollection, where('mobile', '==', mobile.trim()));
        const mobileSnapshot = await getDocs(mobileQuery);
        if (!emailSnapshot.empty || !mobileSnapshot.empty) isDuplicate = true;
      } catch (err) {
        console.error('[AskXpert Server] Firebase duplicate check failed:', err);
      }
    }

    if (useSupabase && !isDuplicate) {
      try {
        const { data: existingEmail, error: emailErr } = await supabase.from('registrations').select('id').eq('email', email.trim().toLowerCase()).limit(1);
        if (emailErr) throw emailErr;
        const { data: existingMobile, error: mobileErr } = await supabase.from('registrations').select('id').eq('mobile', mobile.trim()).limit(1);
        if (mobileErr) throw mobileErr;
        if ((existingEmail && existingEmail.length > 0) || (existingMobile && existingMobile.length > 0)) isDuplicate = true;
      } catch (err) {
        console.error('[AskXpert Server] Supabase duplicate check failed:', err);
      }
    }

    // Check Google Sheets for duplicates
    if (useGoogleSheets && !isDuplicate) {
      try {
        const response = await sheetsClient.spreadsheets.values.get({
          spreadsheetId,
          range: `${SHEET_RANGE}!C:D`, // Email (C) and Mobile (D) columns
        });
        const rows = response.data.values || [];
        for (const row of rows) {
          if (row[0]?.toLowerCase() === email.trim().toLowerCase() || row[1] === mobile.trim()) {
            isDuplicate = true;
            break;
          }
        }
      } catch (err) {
        console.error('[AskXpert Server] Google Sheets duplicate check failed:', err);
      }
    }

    if (isDuplicate) {
      res.status(400).json({ success: false, error: 'This email or mobile number is already registered for updates!' });
      return;
    }

    let savedToAtLeastOne = false;

    if (useSupabase) {
      try {
        const { error } = await supabase.from('registrations').insert([newRegistration]);
        if (error) throw error;
        savedToAtLeastOne = true;
      } catch (err) {
        console.error('[AskXpert Server] Supabase save failed:', err);
      }
    }

    if (useFirebase) {
      try {
        await addDoc(registrationsCollection, newRegistration);
        savedToAtLeastOne = true;
      } catch (err) {
        console.error('[AskXpert Server] Firebase save failed:', err);
      }
    }

    // Append to Google Sheets
    if (useGoogleSheets) {
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
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId,
        range: SHEET_RANGE,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] },
      });
    }

    res.status(200).json({ success: true, data: newRegistration });
  } catch (error) {
    console.error('Error saving registration:', error);
    res.status(500).json({ success: false, error: 'Server error: unable to save registration.' });
  }
});

// 2. Fetch all registrations (Admin Protected)
app.get('/api/admin/registrations', async (req, res) => {
  const passcode = req.headers['x-admin-passcode'] || req.query.passcode;

  if (passcode !== ADMIN_PASSCODE) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid passcode.' });
    return;
  }

  try {
    let registrations: any[] = [];
    if (useSupabase) {
      const { data, error } = await supabase.from('registrations').select('*');
      if (error) throw error;
      registrations = data || [];
    } else if (useFirebase) {
      const snapshot = await getDocs(registrationsCollection);
      registrations = snapshot.docs.map((doc: any) => doc.data());
    } else if (useGoogleSheets) {
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_RANGE}!A:I`,
      });
      const rows = response.data.values || [];
      // Skip header row (index 0)
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
    res.status(200).json({ success: true, data: registrations });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ success: false, error: 'Server error: unable to fetch registrations.' });
  }
});

// 3. Clear registrations (Admin Protected - useful for testing/resetting)
app.post('/api/admin/clear', async (req, res) => {
  const { passcode } = req.body;

  if (passcode !== ADMIN_PASSCODE) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid passcode.' });
    return;
  }

  try {
    if (!useSupabase && !useFirebase && !useGoogleSheets) {
      throw new Error('No database configured.');
    }

    if (useSupabase) {
      const { error } = await supabase.from('registrations').delete().neq('id', 'dummy_value_to_delete_all');
      if (error) throw error;
    }

    if (useFirebase) {
      const snapshot = await getDocs(registrationsCollection);
      const deletePromises = snapshot.docs.map((doc: any) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    }

    // Clear Google Sheets (keep header row)
    if (useGoogleSheets) {
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_RANGE}!A:A`,
      });
      const totalRows = response.data.values?.length || 0;
      if (totalRows > 1) {
        await sheetsClient.spreadsheets.values.clear({
          spreadsheetId,
          range: `${SHEET_RANGE}!A2:I${totalRows}`,
        });
      }
    }
    res.status(200).json({ success: true, message: 'All registrations cleared.' });
  } catch (error) {
    console.error('Error clearing registrations:', error);
    res.status(500).json({ success: false, error: 'Server error: unable to clear registrations.' });
  }
});

// Vite Middleware & Static Asset Serving Setup
const startServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    // Development mode with Vite Server Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AskXpert Server] Running on http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
