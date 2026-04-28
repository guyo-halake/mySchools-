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

app.post('/api/notify-results', async (req, res) => {
  const { parentEmail, parentName, studentName, examName, termName, schoolName } = req.body;

  res.status(200).json({ success: true, message: 'Notification queued' });

  try {
    const mailOptions = {
      from: `"${schoolName} - Results Portal" <${process.env.VITE_EMAIL_USER}>`,
      to: parentEmail,
      subject: `New Exam Results Published - ${studentName}`,
      html: `
        <div style="font-family: 'Sora', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <div style="background: #09090b; padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Academic Update</h1>
          </div>
          <div style="padding: 40px; background: white; color: #18181b; line-height: 1.6;">
            <p style="font-weight: 700; font-size: 18px;">Hello ${parentName || 'Parent'},</p>
            <p>We are pleased to inform you that the official academic results for <strong>${studentName}</strong> have been finalized and published on the portal.</p>
            
            <div style="background: #f9f9f9; padding: 25px; border-radius: 15px; margin: 30px 0; border: 1px dashed #e4e4e7;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-transform: uppercase; font-weight: 900;">Academic Details</p>
              <h2 style="margin: 5px 0; font-size: 20px; color: #09090b;">${examName}</h2>
              <p style="margin: 0; color: #3f3f46; font-weight: 600;">${termName}</p>
            </div>

            <p>You can now log in to the parent portal to view the detailed breakdown, teacher remarks, and performance analytics for this term.</p>
            
            <a href="${process.env.VITE_APP_URL || 'http://localhost:3000'}/parent/results" 
               style="display: inline-block; background: #09090b; color: white; padding: 18px 35px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 20px;">
               View Results Report
            </a>

            <p style="margin-top: 40px; font-size: 12px; color: #a1a1aa;">
              Best Regards,<br>
              <strong>Administration</strong><br>
              ${schoolName}
            </p>
          </div>
          <div style="background: #fafafa; padding: 20px; text-align: center; border-top: 1px solid #f0f0f0;">
            <p style="margin: 0; font-size: 10px; color: #d4d4d8; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">
              Generated by Matta Systems - Institutional OS
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Result notification sent to ${parentEmail} for ${studentName}`);
  } catch (error) {
    console.error('❌ Email notification failed:', error);
  }
});

app.post('/api/welcome-admin', async (req, res) => {
  const { adminName, adminEmail, adminPassword } = req.body;

  try {
    const mailOptions = {
      from: `"P3L Developers" <${process.env.VITE_EMAIL_USER}>`,
      to: adminEmail,
      subject: `Welcome to MySchools - Administrative Access Granted`,
      html: `
        <div style="font-family: 'Sora', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 20px; overflow: hidden;">
          <div style="background: #09090b; padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Admin Access Activated</h1>
          </div>
          <div style="padding: 40px; background: white; color: #18181b; line-height: 1.6;">
            <p style="font-weight: 700; font-size: 18px;">Hello ${adminName},</p>
            <p>You have been officially registered as a System Administrator by the **P3L Admin Team**. You now have full access to the MySchools infrastructure command center.</p>
            
            <div style="background: #f9f9f9; padding: 25px; border-radius: 15px; margin: 30px 0; border: 1px dashed #e4e4e7;">
              <p style="margin: 0; font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 900;">Access Credentials</p>
              <p style="margin: 10px 0 5px; font-size: 14px; color: #09090b;"><strong>Email:</strong> ${adminEmail}</p>
              <p style="margin: 0; font-size: 14px; color: #09090b;"><strong>Password:</strong> ${adminPassword}</p>
            </div>

            <p>Please log in to the dashboard to begin your administrative duties. For security reasons, we recommend reviewing your profile settings upon your first login.</p>
            
            <div style="margin-top: 40px;">
              <p style="margin: 0; font-size: 14px; color: #09090b;">Best Regards,</p>
              <p style="margin: 5px 0; font-size: 16px; font-weight: 800; color: #09090b;">Razak Guyo</p>
              <p style="margin: 0; font-size: 12px; color: #71717a; font-weight: 600;">P3L Developers</p>
            </div>
          </div>
          <div style="background: #fff7ed; padding: 20px; text-align: center; border-top: 1px solid #ffedd5; display: flex; align-items: center; justify-content: center; gap: 10px;">
            <span style="font-size: 18px;">ℹ️</span>
            <p style="margin: 0; font-size: 10px; color: #9a3412; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
              This notification was auto-generated by Matta AI Systems.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Welcome email failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// TECH OPS: GOD-MODE OS BRIDGE
// ==========================================
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 1. Directory Manager: Read all scripts dynamically
app.get('/api/techops/scripts', (req, res) => {
  try {
    const files = fs.readdirSync(PROJECT_ROOT);
    const scripts = files.filter(f => f.endsWith('.cjs') || f.endsWith('.py') || f.endsWith('.sql'));
    
    // Also check scratch folder
    const scratchPath = path.join(PROJECT_ROOT, 'scratch');
    let scratchScripts = [];
    if (fs.existsSync(scratchPath)) {
      scratchScripts = fs.readdirSync(scratchPath)
        .filter(f => f.endsWith('.cjs') || f.endsWith('.py') || f.endsWith('.sql'))
        .map(f => `scratch/${f}`);
    }

    res.json({ success: true, scripts: [...scripts, ...scratchScripts] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Execution Engine: Run scripts and stream output live
app.post('/api/techops/run-script', (req, res) => {
  const { scriptName } = req.body;
  if (!scriptName) return res.status(400).json({ error: 'No script provided' });
  
  const scriptPath = path.join(PROJECT_ROOT, scriptName);
  if (!fs.existsSync(scriptPath)) return res.status(404).json({ error: 'Script not found' });

  let command = 'node';
  if (scriptName.endsWith('.py')) command = 'python'; 
  
  // Prepare headers for Server-Sent Events / Chunked Streaming
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`> Initializing execution engine...\n> Target: ${scriptName}\n> Command: ${command} ${scriptPath}\n\n`);

  const child = spawn(command, [scriptPath]);
  
  child.stdout.on('data', (data) => {
    res.write(data.toString());
  });

  child.stderr.on('data', (data) => {
    res.write(`[STDERR] ${data.toString()}`);
  });

  child.on('close', (code) => {
    res.write(`\n\n[Process exited with code ${code}]\n> Execution finished.`);
    res.end();
  });

  child.on('error', (err) => {
    res.write(`\n[SPAWN ERROR] Failed to start subprocess: ${err.message}\n`);
    res.end();
  });
});

// 3. Environment Variable Reader
app.get('/api/techops/env', (req, res) => {
  try {
    const envPath = path.join(PROJECT_ROOT, '.env');
    if (!fs.existsSync(envPath)) return res.status(404).json({ error: '.env not found' });
    
    const content = fs.readFileSync(envPath, 'utf8');
    const vars = content.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => {
        const [key, ...rest] = line.split('=');
        return { key: key.trim(), value: rest.join('=').trim() };
      });
      
    res.json({ success: true, variables: vars });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Email Bridge (V2 - Async) running at http://localhost:${PORT}`);
});
