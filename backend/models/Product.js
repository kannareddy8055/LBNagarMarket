import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },
  itemName: { type: String, required: true },
  type: { type: String, enum: ['Vegetable', 'Fruit', 'Flower'], required: true },
}, { timestamps: true });

export default mongoose.model('Product', ProductSchema);
