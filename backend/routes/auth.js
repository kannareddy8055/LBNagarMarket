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

const JWT_SECRET = process.env.JWT_SECRET || 'mandi_erp_secret_key_2026';

// Debug: verify credentials loaded
console.log(`[EMAIL] SMTP_USER = ${process.env.SMTP_USER || '❌ NOT FOUND'}`);
console.log(`[EMAIL] SMTP_PASS = ${process.env.SMTP_PASS ? '✅ Loaded (' + process.env.SMTP_PASS.length + ' chars)' : '❌ NOT FOUND'}`);

// Email Configuration — Gmail SMTP via App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error(`[EMAIL] ❌ SMTP Connection Verification Failed: ${error.message}`.red.bold);
    console.error('[EMAIL] Check that SMTP_USER and SMTP_PASS are set correctly in your environment.'.yellow);
  } else {
    console.log(`[EMAIL] ✅ SMTP Connection Verified Successfully! Server is ready to deliver OTPs.`.green.bold);
  }
});


const sendOTPEmail = async (email, otp, type = 'Login') => {
  console.log(`[EMAIL] Sending OTP to: ${email} | OTP: ${otp} | Task: ${type}`.blue.bold);
  try {
     const info = await transporter.sendMail({
       from: `"Mandi Ledger Security" <${process.env.SMTP_USER}>`,
       to: email,
       subject: `${type} Verification Code - Mandi Ledger`,
       html: `
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
       `
     });
     console.log(`[EMAIL] ✅ OTP delivered successfully. MessageId: ${info.messageId}`.green);
  } catch (err) {
    console.error('[EMAIL] ❌ Failed to send email:'.red, err.message);
    console.error('[EMAIL] Make sure SMTP_USER and SMTP_PASS are set in your .env file'.yellow);
  }
};

// Phase 1: Verify Username/Password and Send Email OTP
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'admin') {
      const tenantId = user._id;
      const token = jwt.sign({ id: user._id, username: user.username, role: user.role, tenantId }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, id: user._id, username: user.username, role: user.role, needsOTP: false });
    }

    if (!user.email) return res.status(400).json({ message: 'No email address registered for this account. Contact Admin.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send email in the background (non-blocking) so the login response doesn't hang
    sendOTPEmail(user.email, otp, 'Login').catch(err => {
      console.error('[EMAIL] Background login OTP delivery failed:', err.message);
    });

    res.json({ message: 'OTP sent to your registered email', needsOTP: true, userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Phase 2: Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user || user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

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
    
    // Send email in the background (non-blocking) so the request doesn't hang
    sendOTPEmail(email, otp, 'Account Registration').catch(err => {
      console.error('[EMAIL] Background registration OTP delivery failed:', err.message);
    });
    
    res.json({ message: 'OTP sent to email', otp });
});

export default router;
