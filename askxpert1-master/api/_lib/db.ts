/**
 * Shared database initialization for Vercel Serverless Functions.
 * 
 * Uses lightweight REST APIs instead of heavy SDKs to stay within
 * Vercel's serverless function size limits and avoid ESM/CJS issues.
 * 
 * - Firebase Firestore: REST API v1
 * - Supabase: supabase-js (lightweight)
 * - Google Sheets: REST API with google-auth-library
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// ─── Flags ──────────────────────────────────────────────────
export const useSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_KEY;
export const useFirebase = !!process.env.FIREBASE_PROJECT_ID && !!process.env.FIREBASE_API_KEY;
export const useGoogleSheets =
  !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
  !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
  !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

// ─── Admin passcode ─────────────────────────────────────────
export const ADMIN_PASSCODE = 'IEEECEK2026';

// ─── Google Sheets constants ────────────────────────────────
export const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
export const SHEET_RANGE = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1';
export const SHEET_HEADERS = ['ID', 'Name', 'Email', 'Mobile', 'Department', 'Year of Study', 'IEEE Member', 'IEEE ID', 'Timestamp'];

// ═══════════════════════════════════════════════════════════
//  SUPABASE (lightweight SDK — fine for serverless)
// ═══════════════════════════════════════════════════════════
export let supabase: SupabaseClient | null = null;
if (useSupabase) {
  supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_KEY as string);
}

// ═══════════════════════════════════════════════════════════
//  FIREBASE FIRESTORE — REST API (no SDK needed)
// ═══════════════════════════════════════════════════════════
const FIRESTORE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';
const FIRESTORE_DB_ID = process.env.FIREBASE_FIRESTORE_DATABASE_ID || '(default)';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents`;

/** Run a Firestore structured query to find documents matching a field value */
export async function firestoreQuery(collectionId: string, field: string, value: string): Promise<any[]> {
  const url = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: 'EQUAL',
          value: { stringValue: value },
        },
      },
      limit: 1,
    },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Firestore query failed (${resp.status}): ${errText}`);
  }
  const results = await resp.json();
  // Results is an array; each entry has a `document` field if there's a match
  return results.filter((r: any) => r.document);
}

/** Add a document to a Firestore collection */
export async function firestoreAdd(collectionId: string, data: Record<string, any>): Promise<void> {
  const url = `${FIRESTORE_BASE}/${collectionId}?key=${FIREBASE_API_KEY}`;
  
  // Convert JS object to Firestore fields format
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (typeof val === 'number') {
      fields[key] = { integerValue: String(val) };
    } else {
      fields[key] = { stringValue: String(val) };
    }
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Firestore add failed (${resp.status}): ${errText}`);
  }
}

/** Get all documents from a Firestore collection */
export async function firestoreGetAll(collectionId: string): Promise<any[]> {
  const url = `${FIRESTORE_BASE}/${collectionId}?key=${FIREBASE_API_KEY}`;
  const resp = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Firestore getAll failed (${resp.status}): ${errText}`);
  }
  const result = await resp.json();
  if (!result.documents) return [];

  return result.documents.map((doc: any) => {
    const data: Record<string, any> = {};
    for (const [key, val] of Object.entries(doc.fields || {})) {
      const v = val as any;
      if ('stringValue' in v) data[key] = v.stringValue;
      else if ('booleanValue' in v) data[key] = v.booleanValue;
      else if ('integerValue' in v) data[key] = Number(v.integerValue);
      else if ('nullValue' in v) data[key] = null;
      else data[key] = v;
    }
    data._docPath = doc.name; // keep doc path for deletion
    return data;
  });
}

/** Delete a Firestore document by its full path */
export async function firestoreDelete(docPath: string): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/${docPath}?key=${FIREBASE_API_KEY}`;
  const resp = await fetch(url, { method: 'DELETE' });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Firestore delete failed (${resp.status}): ${errText}`);
  }
}

// ═══════════════════════════════════════════════════════════
//  GOOGLE SHEETS — REST API (no googleapis SDK)
// ═══════════════════════════════════════════════════════════
const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Get an OAuth2 access token for Google Sheets using a JWT manually */
async function getGoogleAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY as string).replace(/\\n/g, '\n');

  // Import the private key
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Buffer.from(keyData, 'base64');
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Create JWT
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const encodedSignature = Buffer.from(signature).toString('base64url');
  const jwt = `${signingInput}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    throw new Error(`Google token exchange failed (${tokenResp.status}): ${errText}`);
  }
  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}

let cachedToken: { token: string; expiry: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiry) {
    return cachedToken.token;
  }
  const token = await getGoogleAccessToken();
  cachedToken = { token, expiry: Date.now() + 50 * 60 * 1000 }; // cache for 50 min
  return token;
}

/** Google Sheets: GET values from a range */
export async function sheetsGet(range: string): Promise<{ values: string[][] }> {
  const token = await getToken();
  const encodedRange = encodeURIComponent(range);
  const resp = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodedRange}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Sheets GET failed (${resp.status}): ${errBody}`);
  }
  const data = await resp.json();
  return { values: data.values || [] };
}

/** Google Sheets: UPDATE (overwrite) values in a range */
export async function sheetsUpdate(range: string, values: string[][]): Promise<void> {
  const token = await getToken();
  const encodedRange = encodeURIComponent(range);
  const resp = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodedRange}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  );
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Sheets UPDATE failed (${resp.status}): ${errBody}`);
  }
}

/** Google Sheets: APPEND rows */
export async function sheetsAppend(range: string, values: string[][]): Promise<void> {
  const token = await getToken();
  const encodedRange = encodeURIComponent(range);
  const resp = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  );
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Sheets APPEND failed (${resp.status}): ${errBody}`);
  }
}

/** Google Sheets: CLEAR values in a range */
export async function sheetsClear(range: string): Promise<void> {
  const token = await getToken();
  const encodedRange = encodeURIComponent(range);
  const resp = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodedRange}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Sheets CLEAR failed (${resp.status}): ${errBody}`);
  }
}
