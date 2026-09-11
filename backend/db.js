// db.js
// Centralizes all Supabase Storage + database calls used by server.js,
// so each route doesn't repeat the same fetch/headers boilerplate.
//
// Requires these environment variables to be set:
//   SUPABASE_URL            - your project's API URL (Project Settings -> Data API)
//   SUPABASE_SERVICE_KEY    - the Secret key (NOT the Published/anon key)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);
}

/**
 * Uploads a PDF buffer to a Supabase Storage bucket.
 * Returns the file's path within the bucket on success.
 * Throws on failure — the caller should catch and respond appropriately.
 */
async function uploadPdfToStorage(buffer, fileName, bucket = 'offer-letters') {
  if (!isConfigured()) {
    throw new Error('Supabase is not configured (missing SUPABASE_URL / SUPABASE_SERVICE_KEY).');
  }

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/pdf',
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const err = new Error('Failed to upload PDF to Supabase Storage');
    err.details = errorBody;
    throw err;
  }

  return fileName;
}

/**
 * Inserts one row into the offer_sends table.
 * Throws on failure — the caller decides whether a logging failure
 * should also fail the whole request, or just be logged and ignored.
 */
async function logOfferSend({ candidateName, jobTitle, recipientEmail, pdfPath, status, resendId }) {
  if (!isConfigured()) {
    throw new Error('Supabase is not configured (missing SUPABASE_URL / SUPABASE_SERVICE_KEY).');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/offer_sends`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      candidate_name: candidateName,
      job_title: jobTitle,
      recipient_email: recipientEmail || null,
      pdf_path: pdfPath || null,
      status,
      resend_id: resendId || null,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const err = new Error('Failed to log offer_sends row');
    err.details = errorBody;
    throw err;
  }
}

module.exports = {
  isConfigured,
  uploadPdfToStorage,
  logOfferSend,
};
