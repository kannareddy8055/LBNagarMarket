import express from 'express';
import CashEntry from '../models/CashEntry.js';
import Account from '../models/Account.js';

const router = express.Router();

// Get all
router.get('/', async (req, res) => {
  try {
    const cash = await CashEntry.find({ tenantId: req.user.tenantId }).sort({ date: -1, createdAt: -1 });
    res.json(cash);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const tenantId = req.user.tenantId;
    const paidAmount = data.amount + data.less;
    const entry = new CashEntry({ ...data, paidAmount, tenantId });
    const saved = await entry.save();

    // Reduce account balance (-)
    await Account.findOneAndUpdate({ _id: data.accountId, tenantId }, { $inc: { balance: -paidAmount } });

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const entry = await CashEntry.findOne({ _id: req.params.id, tenantId });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    // Reverse balance (+)
    await Account.findOneAndUpdate({ _id: entry.accountId, tenantId }, { $inc: { balance: entry.paidAmount } });

    await CashEntry.findOneAndDelete({ _id: req.params.id, tenantId });
    res.json({ message: 'Deleted and state reversed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update
router.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const oldEntry = await CashEntry.findOne({ _id: req.params.id, tenantId });
    if (!oldEntry) return res.status(404).json({ message: 'Entry not found' });

    const data = req.body;
    const paidAmount = data.amount + data.less;

    // 1. Reverse old account balance (+)
    await Account.findOneAndUpdate(
      { _id: oldEntry.accountId, tenantId },
      { $inc: { balance: oldEntry.paidAmount } }
    );

    // 2. Apply new account balance (-)
    await Account.findOneAndUpdate(
      { _id: data.accountId, tenantId },
      { $inc: { balance: -paidAmount } }
    );

    // 3. Update database entry
    const updated = await CashEntry.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { ...data, paidAmount },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
