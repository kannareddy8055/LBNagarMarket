import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import colors from 'colors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';

import User from './models/User.js';
import Account from './models/Account.js';
import Product from './models/Product.js';
import Purchase from './models/Purchase.js';
import Sale from './models/Sale.js';
import CashEntry from './models/CashEntry.js';
import Stock from './models/Stock.js';
import Wastage from './models/Wastage.js';
import { rebuildStockForFarmerItem } from './utils/stockUtils.js';

dotenv.config();
process.env.TZ = 'Asia/Kolkata';

const app = express();

const seedUsers = async () => {
  try {
    const users = [
      { username: 'superadmin', password: 'superadmin@123', role: 'admin' },
      { username: 'owner', password: 'owner@123', role: 'owner', email: 'devagonisai2005@gmail.com' },
      { username: 'staff', password: 'staff@123', role: 'staff', email: 'devagonisai2005@gmail.com' },
      { username: 'charan', password: 'charan', role: 'owner', email: 'devagonisai2005@gmail.com' },
    ];

    for (const u of users) {
      const exists = await User.findOne({ username: u.username });
      if (!exists) {
        await User.create(u);
        console.log(`User created: ${u.username}`.cyan);
      } else if (!exists.email && u.email) {
        // Fix existing users who have no email
        exists.email = u.email;
        await exists.save();
        console.log(`Updated email for existing user: ${u.username} → ${u.email}`.green);
      }
    }
  } catch (err) {
    console.error("Error seeding users:", err);
  }
};

const runMigration = async () => {
  try {
    const defaultOwner = await User.findOne({ role: 'owner' });
    if (!defaultOwner) {
      console.log("No owner found for migration. Skipping.".yellow);
      return;
    }

    const tenantId = defaultOwner._id;
    console.log(`[MIGRATION] Target Tenant: ${defaultOwner.username} (${tenantId})`.yellow);

    const models = [
      { M: Account, name: 'Account' },
      { M: Product, name: 'Product' },
      { M: Purchase, name: 'Purchase' },
      { M: Sale, name: 'Sale' },
      { M: CashEntry, name: 'CashEntry' },
      { M: Stock, name: 'Stock' },
      { M: Wastage, name: 'Wastage' }
    ];

    for (const { M, name } of models) {
      try {
        const result = await M.updateMany(
          { tenantId: { $exists: false } },
          { $set: { tenantId: tenantId } }
        );
        if (result.modifiedCount > 0) {
          console.log(`[MIGRATION] Assigned tenantId to ${result.modifiedCount} ${name} records`.green);
        }
      } catch (e) {
        console.error(`[MIGRATION] Error updating ${name}:`, e.message);
      }
    }

    console.log(`[MIGRATION] Rebuilding Stock records from transaction history...`.yellow);

    // 1. Get all unique (tenant, farmer, item) combinations from all transactional models
    const combinations = new Set();

    const pEntries = await Purchase.find({}, 'tenantId farmerId itemId farmerName itemName');
    pEntries.forEach(e => combinations.add(JSON.stringify({ t: e.tenantId, f: e.farmerId, i: e.itemId, fn: e.farmerName, in: e.itemName })));

    const sEntries = await Sale.find({}, 'tenantId farmerId itemId farmerName itemName');
    sEntries.forEach(e => combinations.add(JSON.stringify({ t: e.tenantId, f: e.farmerId, i: e.itemId, fn: e.farmerName, in: e.itemName })));

    const wEntries = await Wastage.find({}, 'tenantId farmerId itemId farmerName itemName');
    wEntries.forEach(e => combinations.add(JSON.stringify({ t: e.tenantId, f: e.farmerId, i: e.itemId, fn: e.farmerName, in: e.itemName })));

    const uniqueCombs = Array.from(combinations).map(c => JSON.parse(c));
    console.log(`[MIGRATION] Found ${uniqueCombs.length} unique Farmer/Item combinations.`.cyan);

    for (const comb of uniqueCombs) {
      try {
        const { t: tenantId, f: farmerId, i: itemId } = comb;
        await rebuildStockForFarmerItem(farmerId, itemId, tenantId);
      } catch (e) {
        console.error(`[MIGRATION] Error rebuilding stock for ${comb.fn}/${comb.in}:`, e.message);
      }
    }
    console.log(`[MIGRATION] Completed successfully.`.green.bold);
  } catch (err) {
    console.error("[MIGRATION] Fatal Error:".red, err);
  }
};

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:8081',
    'http://localhost:3000',
    'https://lb-nagar-market.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Explicitly handle OPTIONS for preflight
app.options('*', cors());

app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Serve frontend static assets in production
if (process.env.NODE_ENV === 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Serve static assets from frontend build directory
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  // All other GET requests serve index.html (client-side routing fallback)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  // Health Check in development
  app.get('/', (req, res) => {
    res.send('Mandi ERP API is running...');
  });
}

// MongoDB Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mandi_erp';

// Connect to MongoDB BEFORE starting server
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
})
  .then(async () => {
    console.log(`\n=== MongoDB Connected: ${mongoose.connection.host} ===`.cyan.bold);

    // Drop old unique stock indexes to allow separate rate-wise stock tracking
    try {
      await mongoose.connection.db.collection('stocks').dropIndex('farmerId_1_itemId_1');
      console.log("[INDEX] Dropped index 'farmerId_1_itemId_1' successfully.".green);
    } catch (e) {
      // Index might not exist, ignore
    }
    try {
      await mongoose.connection.db.collection('stocks').dropIndex('farmerId_1_itemId_1_isRateLess_1');
      console.log("[INDEX] Dropped index 'farmerId_1_itemId_1_isRateLess_1' successfully.".green);
    } catch (e) {
      // Index might not exist, ignore
    }
    try {
      await mongoose.connection.db.collection('stocks').dropIndex('farmerId_1_itemId_1_lastPurchaseRate_1');
      console.log("[INDEX] Dropped index 'farmerId_1_itemId_1_lastPurchaseRate_1' successfully.".green);
    } catch (e) {
      // Index might not exist, ignore
    }

    await seedUsers();
    await runMigration();

    // Start server AFTER successful MongoDB connection
    app.listen(PORT, () => {
      console.log(`--- Server running on port ${PORT} ---`.yellow.bold);
      console.log(`--- API accessible at http://localhost:${PORT}/api ---\n`.green.bold);
    });
  })
  .catch((err) => {
    console.error(`\n=== MongoDB Connection Error ===\n${err.message}`.red.bold);
    console.error(`⚠️  ACTION REQUIRED:`.yellow);
    console.error(`1. Check MongoDB Atlas IP whitelist includes Render IP (0.0.0.0/0 for dynamic IP)`.yellow);
    console.error(`2. Verify MONGO_URI environment variable is correct`.yellow);
    console.error(`3. Wait 60+ seconds for Render deployment to stabilize MongoDB connection`.yellow);
    console.error(`The backend will NOT start until MongoDB connects.`.red);
    process.exit(1);
  });
