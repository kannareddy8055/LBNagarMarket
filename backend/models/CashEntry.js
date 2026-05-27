import mongoose from 'mongoose';

const CashEntrySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  accountName: { type: String, required: true },
  accountCode: { type: String, required: true },
  type: { type: String, enum: ['purchase', 'sales'], required: true },
  amount: { type: Number, required: true },
  less: { type: Number, default: 0 },
  details: { type: String },
  paidAmount: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model('CashEntry', CashEntrySchema);
