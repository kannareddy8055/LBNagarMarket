import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  place: { type: String, default: '' },
  type: { type: String, enum: ['Customer', 'Farmer'], required: true },
  balance: { type: Number, default: 0 }, // positive = owes (customer) or pending (farmer)
}, { timestamps: true });

export default mongoose.model('Account', AccountSchema);
