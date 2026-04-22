import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;

// Supabase Client for Logging
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.VITE_EMAIL_USER || 'p3lcodes@gmail.com',
    pass: process.env.VITE_EMAIL_PASS || 'rhix vnmi pxnm ufsv',
  },
});

app.post('/api/send-reset', async (req, res) => {
  const { userName, userSchool, schoolEmail, email, browserInfo, timestamp } = req.body;

  // 1. Respond IMMEDIATELY to the frontend (FAST UI)
  res.status(200).json({ success: true, message: 'Processing request' });

  // 2. Process in the background
  try {
    // A. Log to Database
    await supabase.from('support_requests').insert([{
      user_name: userName,
      user_email: email,
      school_name: userSchool,
      school_email: schoolEmail,
      browser_info: browserInfo,
      status: 'SENDING'
    }]);

    // B. Send Email
    const mailOptions = {
      from: `"P3L Support" <${process.env.VITE_EMAIL_USER}>`,
      to: 'p3lcodes@gmail.com',
      cc: 'razakwako45@gmail.com',
      subject: `Password Reset - ${userSchool}`,
      text: `
Hi, P3L Developer Admin,

Please reset login password for ${userName}, and email ${email}.

Technical Details:
- Last Request/Login attempt: ${timestamp}
- Accessing from: ${browserInfo}

Institution Details:
- School: ${userSchool}
- Contact Email: ${schoolEmail || 'Not Available'}

--------------------------------------------------
Support Contact Details:
Phone: +254140690525
Email: p3lcodes@gmail.com
In-App Support: p3l@matta.africa
Location: Nairobi, Kenya
Website: www.p3lcodes.vercel.app

P3L Admin - Copyright © Matta.
    `,
    };

    await transporter.sendMail(mailOptions);
    
    // Update DB to SENT
    await supabase.from('support_requests')
      .update({ status: 'SENT' })
      .eq('user_email', email)
      .eq('status', 'SENDING');

    console.log(`✅ Reset email sent for ${userName}`);

  } catch (error) {
    console.error('❌ Background processing failed:', error);
    // Update DB with error
    await supabase.from('support_requests')
      .update({ status: 'FAILED', error_message: error.message })
      .eq('user_email', email)
      .eq('status', 'SENDING');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Email Bridge (V2 - Async) running at http://localhost:${PORT}`);
});
