import express from 'express';
import Purchase from '../models/Purchase.js';
import Account from '../models/Account.js';
import Stock from '../models/Stock.js';
import { rebuildStockForFarmerItem } from '../utils/stockUtils.js';

const router = express.Router();

// Get all
router.get('/', async (req, res) => {
  try {
    const purchases = await Purchase.find({ tenantId: req.user.tenantId }).sort({ date: -1, createdAt: -1 });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get by ID
router.get('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const tenantId = req.user.tenantId;
    const commissionAmount = (data.quantity * data.rate * data.commission) / 100;
    const total = data.quantity * data.rate - commissionAmount - data.expenses - data.hamali;

    const purchase = new Purchase({ ...data, total, tenantId });
    const saved = await purchase.save();

    // Update farmer balance (+)
    await Account.findOneAndUpdate({ _id: data.farmerId, tenantId }, { $inc: { balance: total } });

    // Rebuild Stock
    await rebuildStockForFarmerItem(data.farmerId, data.itemId, tenantId);

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update
router.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const purchase = await Purchase.findOne({ _id: req.params.id, tenantId });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const data = req.body;
    const commissionAmount = (data.quantity * data.rate * data.commission) / 100;
    const newTotal = data.quantity * data.rate - commissionAmount - data.expenses - data.hamali;

    // Reverse old balance (-)
    await Account.findOneAndUpdate({ _id: purchase.farmerId, tenantId }, { $inc: { balance: -purchase.total } });

    // Add new balance (+)
    await Account.findOneAndUpdate({ _id: data.farmerId, tenantId }, { $inc: { balance: newTotal } });

    // Update purchase
    const updated = await Purchase.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { ...data, total: newTotal },
      { new: true }
    );

    // Rebuild old stock
    await rebuildStockForFarmerItem(purchase.farmerId, purchase.itemId, tenantId);

    // Rebuild new stock if it changed
    if (purchase.farmerId.toString() !== data.farmerId.toString() || purchase.itemId.toString() !== data.itemId.toString()) {
      await rebuildStockForFarmerItem(data.farmerId, data.itemId, tenantId);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const purchase = await Purchase.findOne({ _id: req.params.id, tenantId });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    // Reverse balance (-)
    await Account.findOneAndUpdate({ _id: purchase.farmerId, tenantId }, { $inc: { balance: -purchase.total } });

    await Purchase.findOneAndDelete({ _id: req.params.id, tenantId });

    // Rebuild Stock
    await rebuildStockForFarmerItem(purchase.farmerId, purchase.itemId, tenantId);

    res.json({ message: 'Deleted and state reversed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
