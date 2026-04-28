const nodemailer = require('nodemailer');
require('dotenv').config();

// Gmail Credentials from .env
const user = process.env.VITE_EMAIL_USER || 'p3lcodes@gmail.com';
const pass = process.env.VITE_EMAIL_PASS || 'rhix vnmi pxnm ufsv';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass }
});

const mailOptions = {
  from: user,
  to: 'p3lcodes@gmail.com',
  cc: 'razakwako45@gmail.com',
  subject: 'Nodemailer Test - P3L Admin',
  text: 'This is a test email to verify Nodemailer credentials. If you see this, the App-Password is correct.'
};

console.log('--- Testing Nodemailer with Gmail ---');
console.log('Using:', user);

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ Error occurred:', error.message);
  } else {
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  }
});
