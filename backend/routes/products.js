import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      console.error('[PRODUCTS] GET failed: Missing tenantId in request'.red);
      return res.status(401).json({ message: 'Unauthorized: Missing tenant context' });
    }

    const products = await Product.find({ tenantId }).sort({ itemName: 1 });
    res.json(products);
  } catch (err) {
    console.error('[PRODUCTS] GET Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const product = new Product({ ...req.body, tenantId: req.user.tenantId });
    
    // Find highest code within the tenant
    const lastProduct = await Product.findOne({ tenantId: req.user.tenantId }).sort({ code: -1 });
    let nextNum = 1;
    if (lastProduct && lastProduct.code) {
      const match = lastProduct.code.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }
    
    product.code = `P${String(nextNum).padStart(3, '0')}`;

    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Product SAVE error:', err);
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updated = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId }, 
      req.body, 
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Product not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Product.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!deleted) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
