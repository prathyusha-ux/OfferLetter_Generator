// api/send-offer.js
const { uploadPdfToStorage, logOfferSend, isConfigured } = require('../db');

// Vercel/Next API routes cap request bodies around 4.5MB by default.
// Base64 inflates size ~33%, so guard well under that ceiling.
const MAX_BASE64_LENGTH = 4 * 1024 * 1024; // ~4MB of base64 text

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipient, candidateName, jobTitle, pdfBase64 } = req.body || {};

  // Basic validation
  if (!recipient || !pdfBase64) {
    return res.status(400).json({ error: 'recipient and pdfBase64 are required' });
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(recipient)) {
    return res.status(400).json({ error: 'Invalid recipient email' });
  }
  if (pdfBase64.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({ error: 'PDF too large' });
  }

  const name = candidateName || 'Candidate';
  const role = jobTitle || 'the offered role';
  const subject = `Offer Letter - ${name}`;
  const bodyText =
    `Dear ${name},\n\n` +
    `Please find attached your offer letter for the position of ${role}.\n\n` +
    `Regards,\nUX Interfacely`;

  const fileName = `${name.replace(/\s+/g, '_')}_${Date.now()}_Offer_Letter.pdf`;

  let pdfPath = null;

  try {
    // 1. Upload the PDF to Supabase Storage first, so it's retrievable
    //    even if the email send fails afterward.
    if (isConfigured()) {
      try {
        const buffer = Buffer.from(pdfBase64, 'base64');
        pdfPath = await uploadPdfToStorage(buffer, fileName);
      } catch (uploadErr) {
        // Don't block the email send just because storage failed —
        // but do surface it, since "store the offer letter" was the point.
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
        from: process.env.FROM_EMAIL, // must be a verified domain in Resend
        to: [recipient],
        subject,
        text: bodyText,
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

      // Still log the failed attempt if we have storage configured,
      // so there's a record even when the send fails.
      if (isConfigured()) {
        try {
          await logOfferSend({
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
    if (isConfigured()) {
      try {
        await logOfferSend({
          candidateName: name,
          jobTitle: role,
          recipientEmail: recipient,
          pdfPath,
          status: 'sent',
          resendId: resendData.id || null,
        });
      } catch (logErr) {
        // Don't fail the whole request just because logging failed —
        // the email already went out successfully.
        console.error('Supabase logging failed:', logErr.details || logErr.message);
      }
    }

    return res.status(200).json({ success: true, id: resendData.id, pdfPath });
  } catch (err) {
    console.error('send-offer error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
