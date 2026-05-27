import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import Wastage from '../models/Wastage.js';
import Stock from '../models/Stock.js';

const getTransactionTime = (dateStr, createdAtVal) => {
  const baseDate = new Date(dateStr || createdAtVal);
  if (createdAtVal) {
    const timeSource = new Date(createdAtVal);
    baseDate.setHours(
      timeSource.getHours(),
      timeSource.getMinutes(),
      timeSource.getSeconds(),
      timeSource.getMilliseconds()
    );
  }
  return baseDate;
};

export const rebuildStockForFarmerItem = async (farmerId, itemId, tenantId) => {
  // Fetch ALL transactions for this farmer/item to simulate history
  const [purchases, sales, wastages] = await Promise.all([
    Purchase.find({ farmerId, itemId, tenantId }),
    Sale.find({ farmerId, itemId, tenantId }),
    Wastage.find({ farmerId, itemId, tenantId })
  ]);
  
  // Merge and sort chronologically by date and then by createdAt time
  const timeline = [
    ...purchases.map(p => ({
      type: 'P',
      qty: p.quantity,
      rate: p.rate,
      time: getTransactionTime(p.date, p.createdAt),
      createdAt: p.createdAt || p._id.getTimestamp()
    })),
    ...sales.map(sl => ({
      type: 'S',
      qty: sl.quantity,
      isRateLess: sl.isRateLess || false,
      purchaseRateAtTime: sl.purchaseRateAtTime || 0,
      time: getTransactionTime(sl.date, sl.createdAt),
      createdAt: sl.createdAt || sl._id.getTimestamp()
    })),
    ...wastages.map(w => ({
      type: 'W',
      qty: w.quantity,
      purchaseRateAtTime: w.purchaseRateAtTime || 0,
      time: getTransactionTime(w.date, w.createdAt),
      createdAt: w.createdAt || w._id.getTimestamp()
    }))
  ].sort((a, b) => a.time - b.time);

  // Fetch existing stock records to check if any rate was soft-deleted (has deletedAt)
  const existingStocks = await Stock.find({ farmerId, itemId, tenantId });
  const deletedAtMap = new Map();
  for (const s of existingStocks) {
    if (s.deletedAt) {
      deletedAtMap.set(s.avgPurchaseRate, new Date(s.deletedAt));
    }
  }

  // Filter chronological timeline to ignore transactions for a rate created before or equal to its deletion timestamp
  const filteredTimeline = timeline.filter(tx => {
    let rate = 0;
    if (tx.type === 'P') {
      rate = tx.rate;
    } else if (tx.type === 'S') {
      rate = tx.isRateLess ? 0 : tx.purchaseRateAtTime;
    } else if (tx.type === 'W') {
      rate = tx.purchaseRateAtTime;
    }

    if (deletedAtMap.has(rate)) {
      const deletedAt = deletedAtMap.get(rate);
      const txCreatedAt = new Date(tx.createdAt);
      return txCreatedAt.getTime() > deletedAt.getTime();
    }
    return true;
  });

  // Rate -> Quantity map
  const stocksMap = new Map();

  for (const tx of filteredTimeline) {
    if (tx.type === 'P') {
      let remQty = tx.qty;
      // 1. Resolve negative stock at rate 0 (rate-less/catalog sales) first
      const neg0Qty = stocksMap.get(0) || 0;
      if (neg0Qty < 0) {
        const fill = Math.min(remQty, Math.abs(neg0Qty));
        stocksMap.set(0, neg0Qty + fill);
        remQty -= fill;
      }
      // 2. Remaining goes to this purchase rate stock
      if (remQty > 0) {
        stocksMap.set(tx.rate, (stocksMap.get(tx.rate) || 0) + remQty);
      }
    } else if (tx.type === 'S') {
      if (tx.isRateLess) {
        stocksMap.set(0, (stocksMap.get(0) || 0) - tx.qty);
      } else {
        stocksMap.set(tx.purchaseRateAtTime, (stocksMap.get(tx.purchaseRateAtTime) || 0) - tx.qty);
      }
    } else if (tx.type === 'W') {
      stocksMap.set(tx.purchaseRateAtTime, (stocksMap.get(tx.purchaseRateAtTime) || 0) - tx.qty);
    }
  }

  // Post-processing reconciliation:
  // If there is negative stock at rate 0 (rate-less sales), and there is positive stock at other rates,
  // reconcile them to reduce the negative rate 0 stock towards zero.
  let neg0Qty = stocksMap.get(0) || 0;
  if (neg0Qty < 0) {
    for (const [rate, qty] of stocksMap.entries()) {
      if (rate !== 0 && qty > 0) {
        const fill = Math.min(qty, Math.abs(neg0Qty));
        stocksMap.set(rate, qty - fill);
        neg0Qty += fill;
        stocksMap.set(0, neg0Qty);
        if (neg0Qty >= 0) break;
      }
    }
  }

  // Get farmer and item names for stock records
  let farmerName = "";
  let itemName = "";
  if (purchases.length > 0) {
    farmerName = purchases[0].farmerName;
    itemName = purchases[0].itemName;
  } else if (sales.length > 0) {
    farmerName = sales[0].farmerName;
    itemName = sales[0].itemName;
  } else if (wastages.length > 0) {
    farmerName = wastages[0].farmerName;
    itemName = wastages[0].itemName;
  }

  // If no transactions exist, delete all stock entries for this farmer/item
  if (!farmerName || !itemName) {
    await Stock.deleteMany({ farmerId, itemId, tenantId });
    return;
  }

  // Update or delete stock records based on computed quantities
  for (const [rate, qty] of stocksMap.entries()) {
    const existing = await Stock.findOne({ farmerId, itemId, avgPurchaseRate: rate, tenantId });
    if (existing && existing.manuallyAdjusted) {
      continue;
    }

    if (qty === 0) {
      // Delete empty stock entries to prevent cluttering the UI
      await Stock.deleteOne({ farmerId, itemId, avgPurchaseRate: rate, tenantId });
    } else {
      await Stock.findOneAndUpdate(
        { farmerId, itemId, avgPurchaseRate: rate, tenantId },
        { 
          $set: { 
            quantity: qty, 
            farmerName,
            itemName,
            isDeleted: false
          } 
        },
        { upsert: true }
      );
    }
  }

  // Double check and clean up any stock records that are not in the map
  const allStockRecords = await Stock.find({ farmerId, itemId, tenantId });
  for (const record of allStockRecords) {
    if (record.isDeleted || record.manuallyAdjusted) {
      continue;
    }
    if (!stocksMap.has(record.avgPurchaseRate)) {
      await Stock.deleteOne({ _id: record._id });
    }
  }
};
