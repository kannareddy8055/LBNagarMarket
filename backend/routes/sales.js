import express from 'express';
import Sale from '../models/Sale.js';
import Account from '../models/Account.js';
import Stock from '../models/Stock.js';
import Purchase from '../models/Purchase.js';
import { rebuildStockForFarmerItem } from '../utils/stockUtils.js';

const router = express.Router();

// Get all
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find({ tenantId: req.user.tenantId }).sort({ date: -1, createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save (Includes stock validation and mapping)
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const tenantId = req.user.tenantId;

    const purchaseRateAtTime = data.isRateLess ? 0 : (data.purchaseRateAtTime || 0);
    const purchaseCommissionAtTime = 0;

    const total = data.quantity * data.rate + data.expenses + data.hamali;

    const sale = new Sale({ 
      ...data, 
      total, 
      purchaseRateAtTime, 
      purchaseCommissionAtTime,
      tenantId
    });
    
    const saved = await sale.save();

    // Update customer balance (+)
    await Account.findOneAndUpdate({ _id: data.customerId, tenantId }, { $inc: { balance: total } });

    // Rebuild Stock
    await rebuildStockForFarmerItem(data.farmerId, data.itemId, tenantId);

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const sale = await Sale.findOne({ _id: req.params.id, tenantId });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    // Reverse balance (-)
    await Account.findOneAndUpdate({ _id: sale.customerId, tenantId }, { $inc: { balance: -sale.total } });

    await Sale.findOneAndDelete({ _id: req.params.id, tenantId });

    // Rebuild Stock
    await rebuildStockForFarmerItem(sale.farmerId, sale.itemId, tenantId);

    res.json({ message: 'Deleted and state reversed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update (Includes stock reversal and re-validation)
router.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const oldSale = await Sale.findOne({ _id: req.params.id, tenantId });
    if (!oldSale) return res.status(404).json({ message: 'Sale not found' });

    const newDate = req.body;
    
    // Reverse old customer balance (-)
    await Account.findOneAndUpdate({ _id: oldSale.customerId, tenantId }, { $inc: { balance: -oldSale.total } });

    // Apply new total
    const total = newDate.quantity * newDate.rate + newDate.expenses + newDate.hamali;
    const purchaseRateAtTime = newDate.isRateLess ? 0 : (newDate.purchaseRateAtTime || 0);

    const updated = await Sale.findOneAndUpdate({ _id: req.params.id, tenantId }, { 
      ...newDate, 
      total,
      purchaseRateAtTime
    }, { new: true });

    // Update new customer balance (+)
    await Account.findOneAndUpdate({ _id: newDate.customerId, tenantId }, { $inc: { balance: total } });

    // Rebuild old stock
    await rebuildStockForFarmerItem(oldSale.farmerId, oldSale.itemId, tenantId);

    // Rebuild new stock if it changed
    if (oldSale.farmerId.toString() !== newDate.farmerId.toString() || oldSale.itemId.toString() !== newDate.itemId.toString()) {
      await rebuildStockForFarmerItem(newDate.farmerId, newDate.itemId, tenantId);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
