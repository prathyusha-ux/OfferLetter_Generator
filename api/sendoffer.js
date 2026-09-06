export default async function handler(req, res) {
  // Only allow POST
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
        from: process.env.FROM_EMAIL, // must be a verified domain in Resend
        to: [recipient],
        subject: subject,
        text: bodyText,
        attachments: [
          {
            filename: `${name.replace(/\s+/g, '_')}_Offer_Letter.pdf`,
            content: pdfBase64, // Resend accepts base64 content directly
          },
        ],
      }),
    });
 
    const resendData = await resendResponse.json();
 
    if (!resendResponse.ok) {
      console.error('Resend error:', resendData);
      return res.status(502).json({ error: 'Failed to send email', details: resendData });
    }
 
    // 2. Log the send in Supabase (optional — safe to skip if env vars aren't set)
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
        // Don't fail the whole request just because logging failed
        console.error('Supabase logging failed:', logErr);
      }
    }
 
    return res.status(200).json({ success: true, id: resendData.id });
  } catch (err) {
    console.error('send-offer error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}