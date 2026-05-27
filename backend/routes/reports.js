import express from 'express';
import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import CashEntry from '../models/CashEntry.js';
import Account from '../models/Account.js';
import Wastage from '../models/Wastage.js';

const router = express.Router();

// Get Profit Report for a Date
router.get('/profit', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });
    const tenantId = req.user.tenantId;

    const sales = await Sale.find({ date, tenantId });
    const wastages = await Wastage.find({ date, tenantId });
    
    const itemWise = {};
    const farmerWise = {};

    // Group sales by (farmer, item) to perform simulation per item
    const saleGroups = {};
    for (const s of sales) {
      const key = `${s.farmerId}_${s.itemId}`;
      if (!saleGroups[key]) saleGroups[key] = { farmerId: s.farmerId, itemId: s.itemId, sales: [] };
      saleGroups[key].sales.push(s);
    }

    for (const key in saleGroups) {
      const group = saleGroups[key];
      
      // Fetch all historical purchases, sales, and wastage for this item to resolve accurate costs
      const allPurchases = await Purchase.find({ tenantId, farmerId: group.farmerId, itemId: group.itemId }).sort({ date: 1, createdAt: 1 });
      const allSales = await Sale.find({ tenantId, farmerId: group.farmerId, itemId: group.itemId }).sort({ date: 1, createdAt: 1 });
      const allWastages = await Wastage.find({ tenantId, farmerId: group.farmerId, itemId: group.itemId }).sort({ date: 1, createdAt: 1 });

      // Interleave transactions chronologically
      const transactions = [
        ...allPurchases.map(p => ({ type: 'P', id: p._id, date: p.date || '0000-00-00', createdAt: p.createdAt || 0, qty: p.quantity, rate: p.rate, comm: p.commission || 0 })),
        ...allSales.map(s => ({ type: 'S', id: s._id, date: s.date || '0000-00-00', createdAt: s.createdAt || 0, qty: s.quantity, isRateLess: s.isRateLess || false, purchaseRateAtTime: s.purchaseRateAtTime || 0 })),
        ...allWastages.map(w => ({ type: 'W', id: w._id, date: w.date || '0000-00-00', createdAt: w.createdAt || 0, qty: w.quantity, purchaseRateAtTime: w.purchaseRateAtTime || 0 }))
      ].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));

      let inventory = []; // {qty, rate, comm}
      let shortSales = []; // {id, qty, fallbackRate, fallbackComm}
      let sMap = new Map(); // Store resolved cost for each sale by ID

      for (const tx of transactions) {
        if (tx.type === 'P') {
          let remP = tx.qty;
          // Fill matching short sales first (retroactive rate resolution)
          for (let i = 0; i < shortSales.length && remP > 0; i++) {
            let ss = shortSales[i];
            if (ss.rate === tx.rate) {
              let take = Math.min(remP, ss.qty);
              let costInfo = sMap.get(ss.id.toString());
              
              // Subtract fallback cost and add actual purchase cost
              costInfo.totalCost = costInfo.totalCost - (take * ss.fallbackRate) + (take * tx.rate);
              costInfo.totalComm = costInfo.totalComm - (take * ss.fallbackRate * ss.fallbackComm / 100) + (take * tx.rate * tx.comm / 100);
              
              ss.qty -= take;
              remP -= take;
            }
          }
          shortSales = shortSales.filter(ss => ss.qty > 0);

          // Remaining purchase goes to inventory
          if (remP > 0) inventory.push({ qty: remP, rate: tx.rate, comm: tx.comm });
        } else {
          // Sale or Wastage consumes inventory
          let remQty = tx.qty;
          let costInfo = { totalCost: 0, totalComm: 0 };
          
          // Consume from available inventory matching this specific purchase rate
          if (!tx.isRateLess) {
            for (let i = 0; i < inventory.length && remQty > 0; i++) {
              let inv = inventory[i];
              if (inv.rate === tx.purchaseRateAtTime) {
                let take = Math.min(remQty, inv.qty);
                costInfo.totalCost += take * inv.rate;
                costInfo.totalComm += (take * inv.rate * inv.comm / 100);
                inv.qty -= take;
                remQty -= take;
              }
            }
            // Clean up fully consumed inventory items
            inventory = inventory.filter(inv => inv.qty > 0);
          }
          
          if (tx.type === 'S') {
            // Handle remaining sales as "Short" (Negative Stock)
            if (remQty > 0) {
              // Cost for negative stock is 0 until a purchase fills the gap
              let fRate = 0; 
              let fComm = 0;
              
              costInfo.totalCost += remQty * fRate;
              costInfo.totalComm += (remQty * fRate * fComm / 100);
              
              const targetRate = tx.isRateLess ? 0 : tx.purchaseRateAtTime;
              shortSales.push({ id: tx.id, qty: remQty, rate: targetRate, fallbackRate: fRate, fallbackComm: fComm });
            }
            sMap.set(tx.id.toString(), costInfo);
          } else {
            // For Wastage, we just consume the inventory. 
            // We don't need to track cost in sMap as it's handled separately in overall loss calculation.
          }
        }
      }

      // Aggregate profit for the requested date's sales
      for (const s of group.sales) {
        const resolved = sMap.get(s._id.toString());
        const salesValue = s.quantity * s.rate;
        const purchaseCost = resolved?.totalCost || 0; // Purchase cost is the actual cost of the purchased stock
        const profit = salesValue - purchaseCost;

        if (!itemWise[s.itemId]) itemWise[s.itemId] = { itemName: s.itemName, qty: 0, sales: 0, cost: 0, profit: 0, wastage: 0 };
        itemWise[s.itemId].qty += s.quantity;
        itemWise[s.itemId].sales += salesValue;
        itemWise[s.itemId].cost += purchaseCost;
        itemWise[s.itemId].profit += profit;

        if (!farmerWise[s.farmerId]) farmerWise[s.farmerId] = { farmerName: s.farmerName, qty: 0, sales: 0, cost: 0, profit: 0, wastage: 0 };
        farmerWise[s.farmerId].qty += s.quantity;
        farmerWise[s.farmerId].sales += salesValue;
        farmerWise[s.farmerId].cost += purchaseCost;
        farmerWise[s.farmerId].profit += profit;
      }
    }

    const totalWastageLoss = wastages.reduce((acc, w) => acc + w.totalLoss, 0);

    const overall = {
      sales: Object.values(itemWise).reduce((acc, i) => acc + i.sales, 0),
      cost: Object.values(itemWise).reduce((acc, i) => acc + i.cost, 0),
      wastage: totalWastageLoss,
      profit: Object.values(itemWise).reduce((acc, i) => acc + i.profit, 0) - totalWastageLoss,
    };

    res.json({ itemWise: Object.values(itemWise), farmerWise: Object.values(farmerWise), overall });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Advanced Ledger aggregation can be added here
// For now the frontend logic is reused by providing raw transactional data
export default router;
