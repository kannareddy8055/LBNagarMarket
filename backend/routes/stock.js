import express from 'express';
import Stock from '../models/Stock.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const stock = await Stock.find({ tenantId: req.user.tenantId, isDeleted: { $ne: true } }).sort({ farmerName: 1, itemName: 1 });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manual update for adjustments
router.patch('/:id', async (req, res) => {
  try {
    const updated = await Stock.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId }, 
      { ...req.body, manuallyAdjusted: true, isDeleted: false }, 
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Stock not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete adjustment entry
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Stock.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: { isDeleted: true, quantity: 0, deletedAt: new Date() } },
      { new: true }
    );
    if (!deleted) return res.status(404).json({ message: 'Stock not found' });
    res.json({ message: 'Stock entry removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
