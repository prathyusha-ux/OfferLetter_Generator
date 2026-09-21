// db.js
// Centralizes all Supabase Storage + database calls used by server.js,
// so each route doesn't repeat the same fetch/headers boilerplate.
//
// Requires these environment variables to be set:
//   SUPABASE_URL            - your project's API URL (Project Settings -> Data API)
//   SUPABASE_SERVICE_KEY    - the Secret key (NOT the Published/anon key)
//
// NOTE: if you want to store `resend_id`, add that column to offer_sends first:
//   alter table offer_sends add column resend_id text;
//
// NOTE: to store the Date of Joining, add this column to offer_sends first:
//   alter table offer_sends add column date_of_joining date;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);
}

/**
 * Safely extracts error details from a failed fetch response,
 * falling back to raw text if the body isn't valid JSON.
 */
async function parseErrorBody(response) {
  const clone = response.clone();
  try {
    return await response.json();
  } catch {
    try {
      return { raw: await clone.text() };
    } catch {
      return {};
    }
  }
}

/**
 * Uploads a PDF buffer to a Supabase Storage bucket.
 * Returns the file's path within the bucket on success.
 * Throws on failure — the caller should catch and respond appropriately.
 *
 * @param {boolean} upsert - if true, overwrites an existing file at the same path.
 *   Defaults to false so accidental filename collisions fail loudly instead of
 *   silently overwriting someone else's offer letter.
 */
async function uploadPdfToStorage(buffer, fileName, bucket = 'offer-letters', upsert = false) {
  if (!isConfigured()) {
    throw new Error('Supabase is not configured (missing SUPABASE_URL / SUPABASE_SERVICE_KEY).');
  }

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/pdf',
      'x-upsert': String(upsert),
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    const err = new Error('Failed to upload PDF to Supabase Storage');
    err.status = response.status;
    err.details = errorBody;
    throw err;
  }

  return fileName;
}

/**
 * Inserts one row into the offer_sends table.
 * Throws on failure — the caller decides whether a logging failure
 * should also fail the whole request, or just be logged and ignored.
 *
 * Returns the inserted row (with its generated id/created_at) since
 * we request `return=representation`.
 */
async function logOfferSend({ candidateName, jobTitle, recipientEmail, pdfPath, status, resendId, doj }) {
  if (!isConfigured()) {
    throw new Error('Supabase is not configured (missing SUPABASE_URL / SUPABASE_SERVICE_KEY).');
  }

  const payload = {
    candidate_name: candidateName,
    job_title: jobTitle,
    recipient_email: recipientEmail || null,
    pdf_path: pdfPath || null,
    status,
  };

  // Only include date_of_joining if the caller passed one AND the column
  // exists in your table. Add it first with:
  //   alter table offer_sends add column date_of_joining date;
  if (doj) {
    payload.date_of_joining = doj;
  }

  // Only include resend_id if the caller passed one AND the column exists in your table.
  // Remove this block if you haven't added a resend_id column to offer_sends.
  if (resendId) {
    payload.resend_id = resendId;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/offer_sends`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    const err = new Error('Failed to log offer_sends row');
    err.status = response.status;
    err.details = errorBody;
    throw err;
  }

  const rows = await response.json().catch(() => []);
  return rows[0] || null;
}

module.exports = {
  isConfigured,
  uploadPdfToStorage,
  logOfferSend,
};
