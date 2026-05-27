import express from 'express';
import Wastage from '../models/Wastage.js';
import Stock from '../models/Stock.js';
import Purchase from '../models/Purchase.js';
import { rebuildStockForFarmerItem } from '../utils/stockUtils.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const wastages = await Wastage.find({ tenantId: req.user.tenantId }).sort({ date: -1, createdAt: -1 });
    res.json(wastages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const tenantId = req.user.tenantId;
    
    // Find the first stock batch that has positive inventory
    const stock = await Stock.findOne({ farmerId: data.farmerId, itemId: data.itemId, quantity: { $gt: 0 }, tenantId });
    if (!stock || stock.quantity < data.quantity) {
      return res.status(400).json({ message: `Insufficient stock for wastage. Available: ${stock?.quantity || 0}kg` });
    }

    const purchaseRateAtTime = stock.avgPurchaseRate || 0;
    const totalLoss = data.quantity * purchaseRateAtTime;

    const wastage = new Wastage({ 
      ...data, 
      purchaseRateAtTime, 
      totalLoss,
      tenantId
    });
    
    const saved = await wastage.save();

    // Rebuild Stock
    await rebuildStockForFarmerItem(data.farmerId, data.itemId, tenantId);

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const wastage = await Wastage.findOne({ _id: req.params.id, tenantId });
    if (!wastage) return res.status(404).json({ message: 'Wastage not found' });

    await Wastage.findOneAndDelete({ _id: req.params.id, tenantId });

    // Rebuild Stock
    await rebuildStockForFarmerItem(wastage.farmerId, wastage.itemId, tenantId);

    res.json({ message: 'Deleted and stock returned' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
