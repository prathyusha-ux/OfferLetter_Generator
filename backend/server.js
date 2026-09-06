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

const app = express();

// Increase the body size limit — a PDF as base64 can be a few MB
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*', // set ALLOWED_ORIGIN in production
}));

// Increase the body size limit — a PDF as base64 can be several MB
app.use(express.json({ limit: '30mb' }));

app.get('/', (req, res) => {
  res.send('Offer letter backend is running.');
});

app.post('/api/send-offer', async (req, res) => {
  const { recipient, candidateName, jobTitle, pdfBase64 } = req.body || {};

  // Basic validation
  if (!recipient || !pdfBase64) {
    return res.status(400).json({ error: 'recipient and pdfBase64 are required' });
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(recipient)) {
    return res.status(400).json({ error: 'Invalid recipient email' });
  }

  const name = candidateName || 'Candidate';
  const role = jobTitle || 'the offered role';
  const subject = `Offer Letter - ${name}`;
  const bodyText =
    `Dear ${name},\n\n` +
    `Please find attached your offer letter for the position of ${role}.\n\n` +
    `Regards,\nUX Interfacely`;

  try {
    // 1. Send the email via Resend
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
        text: bodyText,
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

    // 2. Log the send in Supabase (optional)
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

// Render sets PORT automatically — don't hardcode it
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
