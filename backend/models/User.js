import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String }, // Switched from phone to email
  role: { type: String, enum: ['admin', 'owner', 'staff'], required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for staff users
  otp: { type: String }, // For login verification
  otpExpires: { type: Date }
}, { timestamps: true });

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    return false;
  }
};

export default mongoose.model('User', userSchema);
