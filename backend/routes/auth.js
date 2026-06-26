import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

// Fix for ES modules: resolve .env path explicitly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const router = express.Router();

// In-memory store for OTPs (Key: userId string, Value: { otp: string, expires: Date })
const otpStore = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'mandi_erp_secret_key_2026';

// Debug: verify credentials loaded
console.log(`[EMAIL] SMTP_USER = ${process.env.SMTP_USER || '❌ NOT FOUND'}`);
console.log(`[EMAIL] SMTP_PASS = ${process.env.SMTP_PASS ? '✅ Loaded (' + process.env.SMTP_PASS.length + ' chars)' : '❌ NOT FOUND'}`);
console.log(`[EMAIL] RESEND_API_KEY = ${process.env.RESEND_API_KEY ? '✅ Loaded (' + process.env.RESEND_API_KEY.length + ' chars)' : '❌ NOT FOUND'}`);

let transporter = null;

if (process.env.RESEND_API_KEY) {
  console.log('[EMAIL] ✅ Resend API configured. Resend will be used for email delivery.'.green.bold);
} else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  console.log('[EMAIL] SMTP credentials detected. Initializing SMTP Transporter...'.cyan);
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS (false for 587, true for 465)
    pool: true, // Use connection pooling to reuse SMTP connections and prevent handshake timeouts
    maxConnections: 5,
    maxMessages: 100,
    family: 4, // Force IPv4 resolution (crucial to prevent IPv6 ENETUNREACH error on Render!)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false // Avoid self-signed certificate blocking in cloud networks
    }
  });

  // Verify connection configuration on startup
  transporter.verify((error, success) => {
    if (error) {
      console.error(`[EMAIL] ❌ SMTP Connection Verification Failed: ${error.message}`.red.bold);
      console.error(error);
      console.error('[EMAIL] Check SMTP_USER, SMTP_PASS, or if your hosting provider blocks port 587.'.yellow);
    } else {
      console.log(`[EMAIL] ✅ SMTP Connection Verified Successfully! Server is ready to deliver OTPs.`.green.bold);
    }
  });
} else {
  console.warn('[EMAIL] ⚠️ No email credentials found (neither RESEND_API_KEY nor SMTP_USER/PASS). Email delivery will fail.'.red.bold);
}

const sendOTPEmail = async (email, otp, type = 'Login') => {
  console.log(`[EMAIL] Sending OTP to: ${email} | OTP: ${otp} | Task: ${type}`.blue.bold);
  
  const subject = `${type} Verification Code - Mandi Ledger`;
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2563eb; text-align: center;">Identity Verification</h2>
      <p>Hello,</p>
      <p>Your 6-digit verification code for <strong>${type}</strong> is:</p>
      <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; border-radius: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #64748b; font-size: 14px;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
      <p style="text-align: center; font-size: 12px; color: #94a3b8;">&copy; 2026 Mandi Ledger Systems Inc.</p>
    </div>
  `;

  // 1. Attempt delivery via Resend API if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      console.log(`[EMAIL] Attempting delivery via Resend API (From: ${fromEmail})...`.cyan);
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: `Mandi Ledger Security <${fromEmail}>`,
          to: [email],
          subject: subject,
          html: htmlContent
        })
      });

      const data = await response.json();
      if (response.ok && data.id) {
        console.log(`[EMAIL] ✅ OTP delivered successfully via Resend. Email ID: ${data.id}`.green);
        return true;
      } else {
        console.error(`[EMAIL] ❌ Resend API returned error:`, data);
      }
    } catch (err) {
      console.error('[EMAIL] ❌ Failed to send via Resend API:'.red, err.message);
    }
  }

  // 2. Fallback to SMTP if transporter is initialized
  if (transporter) {
    try {
      console.log(`[EMAIL] Attempting delivery via SMTP...`.cyan);
      const info = await transporter.sendMail({
        from: `"Mandi Ledger Security" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: htmlContent
      });
      console.log(`[EMAIL] ✅ OTP delivered successfully via SMTP. MessageId: ${info.messageId}`.green);
      return true;
    } catch (err) {
      console.error('[EMAIL] ❌ Failed to send email via SMTP:'.red, err.message);
      console.error('[EMAIL] Detailed SMTP Error:', err);
      return false;
    }
  }

  console.error('[EMAIL] ❌ No valid email transport method succeeded or was configured.'.red.bold);
  return false;
};

// Phase 1: Verify Username/Password and Send Email OTP
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`[AUTH] Login attempt for username: "${username}"`.cyan);
  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.warn(`[AUTH] ❌ User not found: "${username}"`.yellow);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn(`[AUTH] ❌ Password mismatch for user: "${username}"`.yellow);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'admin') {
      console.log(`[AUTH] Admin login successful for "${username}". Generating token...`.green);
      const tenantId = user._id;
      const token = jwt.sign({ id: user._id, username: user.username, role: user.role, tenantId }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, id: user._id, username: user.username, role: user.role, needsOTP: false });
    }

    if (!user.email) {
      console.warn(`[AUTH] ❌ User "${username}" has no registered email.`.yellow);
      return res.status(400).json({ message: 'No email address registered for this account. Contact Admin.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    
    // Save OTP to in-memory store instead of MongoDB
    otpStore.set(user._id.toString(), { otp, expires });

    console.log(`[AUTH] Generating OTP for user "${username}" (Email: ${user.email}). Sending email...`.cyan);
    
    // Await email delivery so we can notify the user if it fails
    const emailSent = await sendOTPEmail(user.email, otp, 'Login');
    if (!emailSent) {
      console.error(`[AUTH] ❌ OTP sending failed for user "${username}"`.red);
      return res.status(500).json({ message: 'Failed to deliver OTP email. Please check server connection and try again.' });
    }

    res.json({ message: 'OTP sent to your registered email', needsOTP: true, userId: user._id });
  } catch (err) {
    console.error(`[AUTH] ❌ Internal server error during login for "${username}":`, err);
    res.status(500).json({ message: err.message });
  }
});

// Phase 2: Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Retrieve and validate OTP from in-memory store
    const storedData = otpStore.get(userId.toString());
    if (!storedData || storedData.otp !== otp || storedData.expires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Remove OTP from memory cache
    otpStore.delete(userId.toString());

    const tenantId = user.role === 'owner' ? user._id : (user.tenantId || user._id);
    const payload = { id: user._id, username: user.username, role: user.role, tenantId };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, id: user._id, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin Route to send verification OTP for new user creation
router.post('/send-creation-otp', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`[AUTH] Sending creation OTP to email: ${email}`.cyan);
    const emailSent = await sendOTPEmail(email, otp, 'Account Registration');
    if (!emailSent) {
      console.error(`[AUTH] ❌ Creation OTP sending failed for email "${email}"`.red);
      return res.status(500).json({ message: 'Failed to deliver OTP email. Please check server connection and try again.' });
    }
    
    res.json({ message: 'OTP sent to email', otp });
});

export default router;
