import express from 'express';
import accountRoutes from './accounts.js';
import productRoutes from './products.js';
import purchaseRoutes from './purchases.js';
import saleRoutes from './sales.js';
import cashRoutes from './cash.js';
import stockRoutes from './stock.js';
import reportRoutes from './reports.js';
import wastageRoutes from './wastage.js';

import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import { requireAuth, restrictStaff } from '../middleware/authMiddleware.js';
 
 const router = express.Router();
 
 router.use('/auth', authRoutes);
 
 // Apply Auth to everything else
 router.use(requireAuth);
 
 // Admin handles its own role checks, but other routes are subject to staff edit restrictions
 router.use('/admin', adminRoutes);
 
 // Apply Staff Restriction (GET/POST only) to all data routes below
 router.use(restrictStaff);
 
 router.use('/accounts', accountRoutes);
router.use('/products', productRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/sales', saleRoutes);
router.use('/cash', cashRoutes);
router.use('/stock', stockRoutes);
router.use('/reports', reportRoutes);
router.use('/wastage', wastageRoutes);

export default router;
