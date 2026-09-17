// server.js — backend API for Render
//
// Render runs this as a persistent web service (not a serverless function
// like Vercel), so unlike api/send-offer.js this file starts its own
// server and listens on a port.
//
// Once deployed, your endpoints will be:
//   POST https://<your-render-service>.onrender.com/api/send-offer
//   POST https://<your-render-service>.onrender.com/api/save-offer
//
// Both routes now require an API key header:
//   x-api-key: <SERVER_API_KEY>
//
// Env vars needed (set these in Render → your service → Environment):
//   RESEND_API_KEY        - from resend.com dashboard
//   FROM_EMAIL             - a verified sender, e.g. "offers@yourdomain.com"
//   ALLOWED_ORIGIN          - the URL of your frontend, e.g. "https://yourapp.vercel.app"
//                             (needed for CORS since frontend and backend are on different domains)
//   SUPABASE_URL            - required for save-offer, optional for send-offer logging
//   SUPABASE_SERVICE_KEY    - required for save-offer, optional for send-offer logging
//   SERVER_API_KEY           - shared secret; requests must send it in the x-api-key header
//   LOGO_URL                 - direct raw URL to the logo image, e.g.
//                              https://raw.githubusercontent.com/prathyusha-ux/REPO_NAME/main/logonew.png
//                              (change this in Render any time — no redeploy needed)
 
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./db');
 
const app = express();
// Raised from 20MB — the switch to full-resolution PNG-based PDF pages
// produces noticeably larger files than the old low-res JPEG version.
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit
 
// CORS must run before body parsing, so error responses (e.g. 413) still get CORS headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
}));
 
app.use(express.json({ limit: '2mb' })); // small JSON only — the PDF comes as multipart file, not base64
 
// ---------------------------------------------------------------------
// Simple shared-secret auth. Without this, anyone who finds the Render
// URL can send emails from your verified domain or write files into
// your Storage bucket. Set SERVER_API_KEY in Render and have your
// frontend send it as the x-api-key header on every request.
// ---------------------------------------------------------------------
function requireApiKey(req, res, next) {
  if (!process.env.SERVER_API_KEY) {
    console.warn('WARNING: SERVER_API_KEY is not set — /api routes are unprotected.');
    return next();
  }
  const key = req.get('x-api-key');
  if (key !== process.env.SERVER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
 
// Company logo shown in the email signature block.
//
// Previously this was embedded as a base64 data: URI and sent as an inline
// email attachment (cid:logo-image), because Gmail strips data: URIs from
// <img src="">. A plain https:// URL does NOT have that problem, so we now
// just point straight at the raw GitHub-hosted PNG. This also means you can
// swap the logo any time by updating LOGO_URL in Render, with no code change
// or redeploy required.

 
app.get('/', (req, res) => {
  res.send('Offer letter backend is running.');
});
 
app.post('/api/send-offer', requireApiKey, upload.single('pdf'), async (req, res) => {
  const { recipient, candidateName, jobTitle, doj, workLocation } = req.body || {};
  const pdfBuffer = req.file ? req.file.buffer : null;
  const pdfBase64 = pdfBuffer ? pdfBuffer.toString('base64') : null;
 
  if (!recipient || !pdfBase64) {
    return res.status(400).json({ error: 'recipient and pdf file are required' });
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(recipient)) {
    return res.status(400).json({ error: 'Invalid recipient email' });
  }
 
  const name = candidateName || 'Candidate';
  const role = jobTitle || 'the offered role';
  const joiningDate = doj || 'the agreed date';
  const location = workLocation || 'our office';
  const subject = `Offer Letter - ${name}`;
 
  // Fixed company/sender details — edit these to match your actual signature block
  const SENDER_NAME = 'Haripriya Gopisetti';
  const SENDER_TITLE = 'Human Resources at UXINTERFACELY IT SOLUTIONS';
  const COMPANY_NAME = 'UXINTERFACELY IT SOLUTIONS LLP';
  const COMPANY_WEBSITE = 'www.uxinterfacely.com';
  const SENDER_EMAIL = 'hr@uxinterfacely.com';
  const SENDER_PHONE = '+91 9381460883';
 
  const TEXT_STYLE = "font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111111;";
  const P_STYLE = `${TEXT_STYLE}margin:0 0 16px 0;`;
 
  const bodyHtml = `
    <div style="${TEXT_STYLE}width:100%;word-wrap:break-word;">
      <p style="${P_STYLE}">Hi ${name},</p>
      <p style="${P_STYLE}"><strong style="color:#1a73e8;">Congratulations</strong>! We are pleased to offer you the position of
      ${role} at ${COMPANY_NAME}, with your date of joining scheduled for ${joiningDate}.</p>
      <p style="${P_STYLE}">We are confident that your skills and experience will be a valuable addition to our team and
      contribute to the growth of our organization.</p>
      <p style="${P_STYLE}">You will be part of the Company's Services Department, and your roles and responsibilities may
      evolve based on business requirements. As ${COMPANY_NAME} is a start-up company, sometimes your role
      may completely change as per the requirements of the company, and you are expected to adapt
      accordingly.</p>
      <p style="${P_STYLE}">Your work location will be our ${location}.<br/>
      Your office timings will be 10:00 AM to 7:00 PM, which must be followed strictly, along with a
      1-hour lunch break. You will be working 5 days a week.</p>
      <p style="${P_STYLE}">You are required to adhere to all company policies, procedures, and maintain strict
      confidentiality regarding company information, including your compensation details.</p>
      <p style="${P_STYLE}"><strong>Kindly sign and accept the attached offer letter and return your PAN and Aadhaar
      details through our secure onboarding portal (not by email reply).</strong></p>
      <p style="${P_STYLE}">We look forward to having you onboard and wish you a successful journey with us.</p>
      <p style="${P_STYLE}">Best Regards,</p>
      <table cellpadding="10" style="border:1px solid #ddd;border-collapse:collapse;width:100%;max-width:480px;${TEXT_STYLE}">
        <tr>
          <td style="border:1px solid #ddd;width:120px;">
           <img src="${process.env.COMPANY_LOGO_URL}" alt="UXInterfacely Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto;">
          </td>
          <td style="border:1px solid #ddd;word-wrap:break-word;${TEXT_STYLE}">
            <div style="${TEXT_STYLE}margin:0 0 4px 0;">${SENDER_NAME}</div>
            <div style="${TEXT_STYLE}margin:0 0 4px 0;">${SENDER_TITLE}</div>
            <div style="${TEXT_STYLE}margin:0 0 4px 0;"><a href="https://${COMPANY_WEBSITE}" style="color:#1a73e8;">${COMPANY_WEBSITE}</a></div>
            <div style="${TEXT_STYLE}margin:0 0 4px 0;"><strong>${COMPANY_NAME}</strong></div>
            <div style="${TEXT_STYLE}margin:0 0 4px 0;"><a href="mailto:${SENDER_EMAIL}" style="color:#1a73e8;">${SENDER_EMAIL}</a></div>
            <div style="${TEXT_STYLE}margin:0;"><a href="tel:${SENDER_PHONE}" style="color:#1a73e8;">${SENDER_PHONE}</a></div>
          </td>
        </tr>
      </table>
    </div>
  `;
 
  const fileName = `${name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  let pdfPath = null;
 
  try {
    // 1. Upload the PDF to Storage first, so a copy exists even if the
    //    email fails, and so this sent offer is retrievable later —
    //    same behavior as /api/save-offer, using db.js.
    if (db.isConfigured()) {
      try {
        pdfPath = await db.uploadPdfToStorage(pdfBuffer, fileName);
      } catch (uploadErr) {
        console.error('Supabase upload failed:', uploadErr.details || uploadErr.message);
      }
    }
 
    // 2. Send the email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: [recipient],
        subject,
        html: bodyHtml,
        attachments: [
          {
            filename: `${name.replace(/\s+/g, '_')}_Offer_Letter.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });
 
    let resendData;
    try {
      resendData = await resendResponse.json();
    } catch {
      resendData = { raw: await resendResponse.text().catch(() => '') };
    }
 
    if (!resendResponse.ok) {
      console.error('Resend error:', resendData);
 
      if (db.isConfigured()) {
        try {
          await db.logOfferSend({
            candidateName: name,
            jobTitle: role,
            recipientEmail: recipient,
            pdfPath,
            status: 'failed',
          });
        } catch (logErr) {
          console.error('Supabase logging failed:', logErr.details || logErr.message);
        }
      }
 
      return res.status(502).json({ error: 'Failed to send email', details: resendData });
    }
 
    // 3. Log the successful send, including where the PDF lives
    if (db.isConfigured()) {
      try {
        await db.logOfferSend({
          candidateName: name,
          jobTitle: role,
          recipientEmail: recipient,
          pdfPath,
          status: 'sent',
          resendId: resendData.id || null,
        });
      } catch (logErr) {
        // The email already went out — don't fail the request over a logging error
        console.error('Supabase logging failed:', logErr.details || logErr.message);
      }
    }
 
    return res.status(200).json({ success: true, id: resendData.id, pdfPath });
  } catch (err) {
    console.error('send-offer error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});
 
// ---------------------------------------------------------------------
// POST /api/save-offer — used by the "Save Offer Letter" button.
// Uploads the PDF to Supabase Storage (bucket: offer-letters) and logs
// a row in the offer_sends table with status 'saved'. Requires
// SUPABASE_URL and SUPABASE_SERVICE_KEY to be set.
// ---------------------------------------------------------------------
app.post('/api/save-offer', requireApiKey, upload.single('pdf'), async (req, res) => {
  if (!db.isConfigured()) {
    return res.status(503).json({ error: 'Supabase is not configured on the server (missing SUPABASE_URL / SUPABASE_SERVICE_KEY).' });
  }
 
  const { candidateName, jobTitle, recipientEmail } = req.body || {};
  const pdfBuffer = req.file ? req.file.buffer : null;
 
  if (!pdfBuffer) {
    return res.status(400).json({ error: 'pdf file is required' });
  }
 
  const name = candidateName || 'Candidate';
  const role = jobTitle || 'the offered role';
  const safeName = name.replace(/\s+/g, '_');
  const fileName = `${safeName}_${Date.now()}.pdf`;
 
  try {
    const pdfPath = await db.uploadPdfToStorage(pdfBuffer, fileName);
 
    try {
      await db.logOfferSend({
        candidateName: name,
        jobTitle: role,
        recipientEmail: recipientEmail || null,
        pdfPath,
        status: 'saved',
      });
    } catch (logErr) {
      console.error('Supabase table insert error:', logErr.details || logErr.message);
      // The file itself uploaded fine even if the log row failed — still tell the frontend it saved
      return res.status(200).json({ success: true, path: pdfPath, warning: 'File saved but logging the record failed' });
    }
 
    return res.status(200).json({ success: true, path: pdfPath });
  } catch (err) {
    console.error('save-offer error:', err.details || err.message);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});
 
// ---------------------------------------------------------------------
// Global error handler — MUST be defined last, after all routes.
//
// Without this, any error thrown before a route's own try/catch runs
// (most commonly: Multer rejecting a file that's over the size limit)
// falls through to Express's built-in default error handler, which
// returns an HTML page with a stack trace instead of JSON. The frontend
// then fails trying to JSON.parse() that HTML, surfacing as a confusing
// "Unexpected token '<'" error instead of the real problem.
// ---------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    console.error('Upload rejected — file too large:', err.message);
    return res.status(413).json({ error: 'The PDF is too large to upload. Try reducing RENDER_SCALE in script.js.' });
  }
  console.error('Unhandled server error:', err);
  return res.status(500).json({ error: 'Server error', details: err && err.message });
});
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  if (!process.env.RESEND_API_KEY) {
    console.warn('WARNING: RESEND_API_KEY is not set — all email sends will fail with a Resend auth error.');
  }
  if (!process.env.FROM_EMAIL) {
    console.warn('WARNING: FROM_EMAIL is not set — Resend will reject sends with no "from" address.');
  }
  if (!process.env.SERVER_API_KEY) {
    console.warn('WARNING: SERVER_API_KEY is not set — /api routes will accept requests from anyone.');
  }
  if (!process.env.LOGO_URL) {
    console.warn('WARNING: LOGO_URL is not set — using the default placeholder logo URL, which will 404.');
  }
});
 
