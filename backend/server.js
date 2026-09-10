// server.js — backend API for Render
//
// Render runs this as a persistent web service (not a serverless function
// like Vercel), so unlike api/send-offer.js this file starts its own
// server and listens on a port.
//
// Once deployed, your endpoint will be:
//   POST https://<your-render-service>.onrender.com/api/send-offer
//
// Same request body as before:
// {
//   "recipient": "candidate@example.com",
//   "candidateName": "Jane Doe",
//   "jobTitle": "Software Engineer",
//   "pdfBase64": "<base64 string of the PDF, no data: prefix>"
// }
//
// Env vars needed (set these in Render → your service → Environment):
//   RESEND_API_KEY        - from resend.com dashboard
//   FROM_EMAIL             - a verified sender, e.g. "offers@yourdomain.com"
//   ALLOWED_ORIGIN          - the URL of your frontend, e.g. "https://yourapp.vercel.app"
//                             (needed for CORS since frontend and backend are on different domains)
//   SUPABASE_URL            - optional, for logging
//   SUPABASE_SERVICE_KEY    - optional, for logging

// server.js — backend API for Render
//
// Render runs this as a persistent web service (not a serverless function
// like Vercel), so unlike api/send-offer.js this file starts its own
// server and listens on a port.
//
// Once deployed, your endpoint will be:
//   POST https://<your-render-service>.onrender.com/api/send-offer
//
// Same request body as before:
// {
//   "recipient": "candidate@example.com",
//   "candidateName": "Jane Doe",
//   "jobTitle": "Software Engineer",
//   "pdfBase64": "<base64 string of the PDF, no data: prefix>"
// }
//
// Env vars needed (set these in Render → your service → Environment):
//   RESEND_API_KEY        - from resend.com dashboard
//   FROM_EMAIL             - a verified sender, e.g. "offers@yourdomain.com"
//   ALLOWED_ORIGIN          - the URL of your frontend, e.g. "https://yourapp.vercel.app"
//                             (needed for CORS since frontend and backend are on different domains)
//   SUPABASE_URL            - optional, for logging
//   SUPABASE_SERVICE_KEY    - optional, for logging

const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB limit

// CORS must run before body parsing, so error responses (e.g. 413) still get CORS headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
}));

app.use(express.json({ limit: '2mb' })); // small JSON only — the PDF now comes as multipart file, not base64

// Company logo shown in the email signature block — embedded as base64 so it
// doesn't depend on the frontend sending it and always renders in the email.
const fs = require('fs');
const data = fs.readFileSync('logonew.png');
const encoded = data.toString('base64');
console.log(`const LOGO_DATA_URI = 'data:image/png;base64,${encoded}';`);
app.get('/', (req, res) => {
  res.send('Offer letter backend is running.');
});

app.post('/api/send-offer', upload.single('pdf'), async (req, res) => {
  const { recipient, candidateName, jobTitle, doj, workLocation } = req.body || {};
  const pdfBase64 = req.file ? req.file.buffer.toString('base64') : null;

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

  const bodyHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;max-width:700px;">
      <p>Hi ${name},</p>
      <p><strong style="color:#1a73e8;">Congratulations</strong>! We are pleased to offer you the position of
      ${role} at ${COMPANY_NAME}, with your date of joining scheduled for ${joiningDate}.</p>
      <p>We are confident that your skills and experience will be a valuable addition to our team and
      contribute to the growth of our organization.</p>
      <p>You will be part of the Company's Services Department, and your roles and responsibilities may
      evolve based on business requirements. As ${COMPANY_NAME} is a start-up company, sometimes your role
      may completely change as per the requirements of the company, and you are expected to adapt
      accordingly.</p>
      <p>Your work location will be our ${location}.<br/>
      Your office timings will be 10:00 AM to 7:00 PM, which must be followed strictly, along with a
      1-hour lunch break. You will be working 5 days a week.</p>
      <p>You are required to adhere to all company policies, procedures, and maintain strict
      confidentiality regarding company information, including your compensation details.</p>
      <p><strong>Kindly sign and accept the attached below offer letter and share it along with your PAN
      card and Aadhaar card details by replying to this same email ID.</strong></p>
      <p>We look forward to having you onboard and wish you a successful journey with us.</p>
      <p>Best Regards,</p>
      <table cellpadding="10" style="border:1px solid #ddd;border-collapse:collapse;">
        <tr>
          <td style="border:1px solid #ddd;">
          <img src="${LOGO_DATA_URI}" alt="UX Interfacely logo" style="max-width:120px;display:block;">
          </td>
          <td style="border:1px solid #ddd;">
            <div>${SENDER_NAME}</div>
            <div>${SENDER_TITLE}</div>
            <div><a href="https://${COMPANY_WEBSITE}">${COMPANY_WEBSITE}</a></div>
            <div><strong>${COMPANY_NAME}</strong></div>
            <div>UX Interfacely</div>
            <div>${SENDER_PHONE}</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  const bodyText =
    `Dear ${name},\n\n` +
    `Please find attached your offer letter for the position of ${role}.\n\n` +
    `Regards,\n${COMPANY_NAME}`;

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: [recipient],
        subject: subject,
        ...(bodyHtml ? { html: bodyHtml } : { text: bodyText }),
        attachments: [
          {
            filename: `${name.replace(/\s+/g, '_')}_Offer_Letter.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend error:', resendData);
      return res.status(502).json({ error: 'Failed to send email', details: resendData });
    }

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/offer_sends`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            candidate_name: name,
            job_title: role,
            recipient_email: recipient,
            resend_id: resendData.id || null,
            status: 'sent',
          }),
        });
      } catch (logErr) {
        console.error('Supabase logging failed:', logErr);
      }
    }

    return res.status(200).json({ success: true, id: resendData.id });
  } catch (err) {
    console.error('send-offer error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
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
});