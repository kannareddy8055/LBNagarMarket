# Veg Ledger (LBNagarMarket)

A premium, responsive MERN-stack Mandi ERP system for managing accounts, products, sales, purchases, cash entries, and stock records. Designed for mandi owners, commission agents, and staff to run their daily operations with high visual fidelity and robust performance.

## Tech Stack
* **Frontend:** React, Vite, TypeScript, TailwindCSS, Radix UI (Shadcn)
* **Backend:** Node.js, Express, ES Modules, Mongoose (MongoDB Atlas)
* **Email:** Nodemailer (Gmail SMTP integration)

## Core Features
1. **Accounts & Contacts:** Track customers and farmers, and compute real-time opening/closing ledger balances.
2. **Products Ledger:** Maintain inventory profiles of vegetables, fruits, and flowers.
3. **Purchases & Sales:** Log daily transactional ledgers, hamali charges, commissions, and expenses.
4. **Cash Management:** Record incoming customer cash payments and outgoing farmer settlements.
5. **Stock Batching:** Monitor rate-wise available batches and wastage losses dynamically.
6. **Detailed Reports:** Access real-time profitability and transaction histories.

---

## Local Development

### 1. Installation
Install dependencies for both frontend and backend concurrently from the root directory:
```bash
npm run install:all
```

### 2. Configure Environment
Create a `.env` file in the `backend/` folder:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
SMTP_USER=your_gmail_address
SMTP_PASS=your_gmail_app_password
```

### 3. Run Concurrently
Launch both development servers (Vite frontend on `http://localhost:8080` and Express API on `http://localhost:5000`):
```bash
npm run dev
```

---

## Production Deployment

This project uses a **Unified Server Deployment** strategy where the Express backend builds and serves the frontend static assets in production, cutting hosting costs and solving CORS out of the box.

### Deploying to Render
1. Push this repository to GitHub.
2. Create a new **Web Service** on Render connected to this repository.
3. Set the following details:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
4. Add the following **Environment Variables**:
   - `NODE_ENV` = `production`
   - `MONGO_URI` = `your_mongodb_connection_uri`
   - `SMTP_USER` = `your_gmail_address`
   - `SMTP_PASS` = `your_gmail_app_password`
