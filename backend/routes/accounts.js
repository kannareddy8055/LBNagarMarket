import express from 'express';
import Account from '../models/Account.js';

const router = express.Router();

// Get all accounts
router.get('/', async (req, res) => {
  try {
    const type = req.query.type;
    const filter = { tenantId: req.user.tenantId };
    if (type) filter.type = type;
    
    const accounts = await Account.find(filter).sort({ name: 1 });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save account
router.post('/', async (req, res) => {
  try {
    const account = new Account({ ...req.body, tenantId: req.user.tenantId });
    const prefix = account.type === 'Customer' ? 'CU' : 'FA';
    
    // Find highest code for this type within the tenant
    const lastAccount = await Account.findOne({ 
      tenantId: req.user.tenantId, 
      type: account.type 
    }).sort({ code: -1 });
    
    let nextNum = 1;
    if (lastAccount && lastAccount.code) {
      const match = lastAccount.code.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }
    
    account.code = `${prefix}${String(nextNum).padStart(5, '0')}`;

    const saved = await account.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Account SAVE error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update
router.patch('/:id', async (req, res) => {
  try {
    const updated = await Account.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId }, 
      req.body, 
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Account not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Account.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!deleted) return res.status(404).json({ message: 'Account not found' });
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
