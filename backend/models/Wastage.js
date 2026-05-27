import mongoose from 'mongoose';

const WastageSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  farmerName: { type: String, required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true },
  purchaseRateAtTime: { type: Number, required: true, default: 0 },
  totalLoss: { type: Number, required: true, default: 0 }
}, { timestamps: true });

export default mongoose.model('Wastage', WastageSchema);
