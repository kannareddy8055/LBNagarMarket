// Mandi ERP API Client (MERN Stack transition)
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

export interface Account {
  _id: string; // Mongoose ID
  id: string; // Compatibility
  code: string;
  name: string;
  phone: string;
  place: string;
  type: 'Customer' | 'Farmer';
  balance: number;
  createdAt: string;
}

export interface Product {
  _id: string;
  id: string;
  code: string;
  itemName: string;
  type: 'Vegetable' | 'Fruit' | 'Flower';
  createdAt: string;
}

export interface Purchase {
  _id: string;
  id: string;
  date: string;
  farmerId: string;
  farmerName: string;
  farmerCode: string;
  itemId: string;
  itemName: string;
  bags: number;
  quantity: number;
  rate: number;
  commission: number;
  hamali: number;
  expenses: number;
  total: number;
  createdAt: string;
}

export interface Sale {
  _id: string;
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  farmerId: string;
  farmerName: string;
  farmerCode: string;
  itemId: string;
  itemName: string;
  bags: number;
  quantity: number;
  rate: number;
  hamali: number;
  expenses: number;
  total: number;
  purchaseRateAtTime: number;
  purchaseCommissionAtTime: number;
  createdAt: string;
}

export interface WastageEntry {
  _id: string;
  id: string;
  date: string;
  farmerId: string;
  farmerName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  purchaseRateAtTime: number;
  totalLoss: number;
  createdAt: string;
}

export interface CashEntry {
  _id: string;
  id: string;
  date: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  type: 'purchase' | 'sales';
  amount: number;
  less: number;
  details: string;
  paidAmount: number;
  createdAt: string;
}

export interface StockEntry {
  _id: string;
  id: string;
  farmerId: string;
  farmerName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  avgPurchaseRate: number;
}

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'owner' | 'staff';
  token?: string;
  tenantId?: string;
}

// Helper to normalize Mongoose docs to legacy id format
const map = (item: any) => ({ ...item, id: item._id });
const mapArr = (arr: any[]) => arr.map(map);

// API Client Wrapper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const userStr = localStorage.getItem('auth_user');
  const token = userStr ? JSON.parse(userStr).token : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }
  const data = await response.json();
  const isPlainObject = (obj: any) => obj && typeof obj === 'object' && !Array.isArray(obj);
  return Array.isArray(data) ? mapArr(data) as any : (isPlainObject(data) ? map(data) as any : data as any);
}

// ===== AUTH API =====
export const login = (credentials: any) => request<any>('/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const verifyOtp = (data: { userId: string, otp: string }) => request<AuthUser>('/auth/verify-otp', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const sendCreationOtp = (email: string) => request<{ message: string, otp: string }>('/auth/send-creation-otp', {
  method: 'POST',
  body: JSON.stringify({ email }),
});

// ===== ADMIN API =====
export const getUsers = () => request<AuthUser[]>('/admin/users');
export const saveUser = (data: any) => request<AuthUser>('/admin/users', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const deleteUser = (id: string) => request<any>(`/admin/users/${id}`, {
  method: 'DELETE',
});

// ===== ACCOUNTS API =====
export const getAccounts = () => request<Account[]>('/accounts');
export const getAccountsByType = (type: string) => request<Account[]>(`/accounts?type=${type}`);

export const saveAccount = (data: any) => request<Account>('/accounts', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateAccount = (id: string, updates: any) => request<Account>(`/accounts/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});

export const deleteAccount = (id: string) => request<void>(`/accounts/${id}`, { method: 'DELETE' });

// ===== PRODUCTS API =====
export const getProducts = () => request<Product[]>('/products');
export const saveProduct = (data: any) => request<Product>('/products', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const updateProduct = (id: string, updates: any) => request<Product>(`/products/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});
export const deleteProduct = (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' });

// ===== PURCHASES API =====
export const getPurchases = () => request<Purchase[]>('/purchases');
export const savePurchase = (data: any) => request<Purchase>('/purchases', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const updatePurchase = (id: string, updates: any) => request<Purchase>(`/purchases/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});
export const deletePurchase = (id: string) => request<void>(`/purchases/${id}`, { method: 'DELETE' });

// ===== SALES API =====
export const getSales = () => request<Sale[]>('/sales');
export const saveSale = async (data: any): Promise<Sale | string> => {
  try {
    return await request<Sale>('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (err: any) {
    return err.message;
  }
};
export const updateSale = (id: string, updates: any) => request<Sale>(`/sales/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});
export const deleteSale = (id: string) => request<void>(`/sales/${id}`, { method: 'DELETE' });

// ===== CASH API =====
export const getCashEntries = () => request<CashEntry[]>('/cash');
export const saveCashEntry = (data: any) => request<CashEntry>('/cash', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateCashEntry = (id: string, updates: any) => request<CashEntry>(`/cash/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});

export const deleteCashEntry = (id: string) => request<void>(`/cash/${id}`, { method: 'DELETE' });

// ===== WASTAGE API =====
export const getWastage = () => request<WastageEntry[]>('/wastage');
export const saveWastage = async (data: any): Promise<WastageEntry | string> => {
  try {
    return await request<WastageEntry>('/wastage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (err: any) {
    return err.message;
  }
};
export const deleteWastage = (id: string) => request<void>(`/wastage/${id}`, { method: 'DELETE' });

// ===== STOCK API =====
export const getStock = () => request<StockEntry[]>('/stock');
export const updateStock = (id: string, updates: any) => request<StockEntry>(`/stock/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});
export const deleteStock = (id: string) => request<void>(`/stock/${id}`, { method: 'DELETE' });

export const getStockForFarmerItem = async (farmerId: string, itemId: string, isRateLess = false, rate?: number) => {
  const stock = await getStock();
  if (isRateLess) {
    const entry = stock.find(s => s.farmerId === farmerId && s.itemId === itemId && s.avgPurchaseRate === 0);
    return entry?.quantity ?? 0;
  }
  if (rate !== undefined) {
    const entry = stock.find(s => s.farmerId === farmerId && s.itemId === itemId && s.avgPurchaseRate === rate);
    return entry?.quantity ?? 0;
  }
  // Sum up all standard batches (with-rate stock)
  return stock
    .filter(s => s.farmerId === farmerId && s.itemId === itemId && s.avgPurchaseRate > 0)
    .reduce((sum, s) => sum + s.quantity, 0);
};

// ===== UTILITY =====
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

export function todayStr(): string {
  const d = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    timeZone: 'Asia/Kolkata', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(d);
}

// ===== REPORT GENERATION HELPERS (Legacy Frontend Aggregation for backwards compatibility) =====

export interface LedgerEntry {
  id?: string;
  type?: 'sale' | 'purchase' | 'cash';
  date: string;
  description: string;
  credit: number;
  debit: number;
  balance: number;
}

export function getCustomerLedger(customerId: string, fromDate: string, toDate: string, allSales: Sale[], allCash: CashEntry[]): LedgerEntry[] {
  const sales = allSales.filter(s => s.customerId === customerId);
  const cash = allCash.filter(c => c.accountId === customerId && c.type === 'sales');
  
  const entries: LedgerEntry[] = [
    ...sales.map(s => ({
      id: s.id,
      type: 'sale' as const,
      date: s.date,
      description: `${s.itemName} ${s.bags} bags, ${s.quantity}kg @ ${s.rate}`,
      credit: s.total,
      debit: 0,
      balance: 0,
    })),
    ...cash.map(c => ({
      id: c.id,
      type: 'cash' as const,
      date: c.date,
      description: `Cash Payment - ${c.details || 'No details'}`,
      credit: 0,
      debit: c.paidAmount,
      balance: 0,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const filtered = entries.filter(e => {
    if (fromDate && e.date < fromDate) return false;
    if (toDate && e.date > toDate) return false;
    return true;
  });

  const beforeStart = entries.filter(e => fromDate && e.date < fromDate);
  let balance = beforeStart.reduce((acc, e) => acc + e.credit - e.debit, 0);

  const ledger: LedgerEntry[] = [];
  if (fromDate) ledger.push({ date: fromDate, description: 'Opening Balance', credit: 0, debit: 0, balance });

  filtered.forEach(e => {
    balance += e.credit - e.debit;
    ledger.push({ ...e, balance });
  });

  return ledger;
}

export function getFarmerLedger(farmerId: string, fromDate: string, toDate: string, allPurchases: Purchase[], allCash: CashEntry[]): LedgerEntry[] {
  const purchases = allPurchases.filter(p => p.farmerId === farmerId);
  const cash = allCash.filter(c => c.accountId === farmerId && c.type === 'purchase');
  
  const entries: LedgerEntry[] = [
    ...purchases.map(p => ({
      id: p.id,
      type: 'purchase' as const,
      date: p.date,
      description: `${p.itemName} ${p.bags} bags, ${p.quantity}kg @ ${p.rate}`,
      credit: p.total,
      debit: 0,
      balance: 0,
    })),
    ...cash.map(c => ({
      id: c.id,
      type: 'cash' as const,
      date: c.date,
      description: `Cash Paid - ${c.details || 'No details'}`,
      credit: 0,
      debit: c.paidAmount,
      balance: 0,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const filtered = entries.filter(e => {
    if (fromDate && e.date < fromDate) return false;
    if (toDate && e.date > toDate) return false;
    return true;
  });

  const beforeStart = entries.filter(e => fromDate && e.date < fromDate);
  let balance = beforeStart.reduce((acc, e) => acc + e.credit - e.debit, 0) || 0;

  const ledger: LedgerEntry[] = [];
  if (fromDate) ledger.push({ date: fromDate, description: 'Opening Balance', credit: 0, debit: 0, balance });

  filtered.forEach(e => {
    balance += e.credit - e.debit;
    ledger.push({ ...e, balance });
  });

  return ledger;
}

export async function getProfitReport(date: string) {
  return request<any>(`/reports/profit?date=${date}`);
}
