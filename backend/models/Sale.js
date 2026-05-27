import mongoose from 'mongoose';

const SaleSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  customerName: { type: String, required: true },
  customerCode: { type: String, required: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  farmerName: { type: String, required: true },
  farmerCode: { type: String, required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  itemName: { type: String, required: true },
  bags: { type: Number, default: 0 },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  hamali: { type: Number, default: 0 },
  expenses: { type: Number, default: 0 },
  total: { type: Number, required: true },
  purchaseRateAtTime: { type: Number },
  purchaseCommissionAtTime: { type: Number },
  isRateLess: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Sale', SaleSchema);
