import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String }, // Switched from phone to email
  role: { type: String, enum: ['admin', 'owner', 'staff'], required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for staff users
  otp: { type: String }, // For login verification
  otpExpires: { type: Date }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
