import mongoose from 'mongoose';

const StockSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  farmerName: { type: String, required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  avgPurchaseRate: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  manuallyAdjusted: { type: Boolean, default: false },
}, { timestamps: true });

// Ensure unique index per farmer+item+rate
StockSchema.index({ farmerId: 1, itemId: 1, avgPurchaseRate: 1 }, { unique: true });

export default mongoose.model('Stock', StockSchema);
