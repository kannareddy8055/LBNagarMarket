import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3, FileText, ListOrdered, IndianRupee, Printer, 
  Download, Search, Filter, Warehouse, TrendingUp, Users, Calendar
} from "lucide-react";
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { 
  getAccounts, getPurchases, getSales, getCashEntries, 
  todayStr, formatCurrency, formatDate, getCustomerLedger, getFarmerLedger, 
  getProfitReport, LedgerEntry, Purchase, Sale, Account, CashEntry
} from "@/lib/store";

export default function ReportsPage() {
  const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const isOwner = user.role === 'owner';
  
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ledger");
  
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    refreshData(); // Refresh all base data
  };
  
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  
  // Data State
  const [accountsAll, setAccountsAll] = useState<Account[]>([]);
  const [purchasesAll, setPurchasesAll] = useState<Purchase[]>([]);
  const [salesAll, setSalesAll] = useState<Sale[]>([]);
  const [cashAll, setCashAll] = useState<CashEntry[]>([]);
  const [profitDataState, setProfitDataState] = useState<any>(null);

  // Ledger State
  const [ledgerType, setLedgerType] = useState<"Customer" | "Farmer">("Customer");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  
  // View Type states for tabs
  const [summaryType, setSummaryType] = useState<"Customer" | "Farmer">("Customer");
  const [dailyViewType, setDailyViewType] = useState<"Customer" | "Farmer">("Customer");
  const [billViewType, setBillViewType] = useState<"Customer" | "Farmer">("Customer");
  const [billsPerPage, setBillsPerPage] = useState<2 | 4 | 6>(6);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  
  // Daily List State
  const [dailyDate, setDailyDate] = useState(todayStr());

  const refreshData = async () => {
    try {
      const [accs, purchs, sals, csh] = await Promise.all([
        getAccounts(),
        getPurchases(),
        getSales(),
        getCashEntries()
      ]);
      setAccountsAll(accs);
      setPurchasesAll(purchs);
      setSalesAll(sals);
      setCashAll(csh);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    const fetchProfit = async () => {
       if (!dailyDate) return;
       try {
         const p = await getProfitReport(dailyDate);
         setProfitDataState(p);
       } catch (err: any) {
         console.error(err);
       }
    };
    fetchProfit();
  }, [dailyDate, activeTab]);

  const accounts = accountsAll.filter(a => a.type === ledgerType);
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // --- LEDGER LOGIC ---
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  useEffect(() => {
    const fetchLedger = async () => {
      if (!selectedAccountId) {
        setLedgerData([]);
        return;
      }
      try {
        const data = ledgerType === "Customer" 
          ? getCustomerLedger(selectedAccountId, dateFrom, dateTo, salesAll, cashAll)
          : getFarmerLedger(selectedAccountId, dateFrom, dateTo, purchasesAll, cashAll);
        setLedgerData(data);
      } catch (err: any) {
        console.error(err);
      }
    };
    fetchLedger();
  }, [selectedAccountId, ledgerType, dateFrom, dateTo]);

  // --- SUMMARIES LOGIC ---
  const summaryData = useMemo(() => {
    const type = activeTab === "summaries" ? (ledgerType || "Customer") : "Customer"; 
    // Simplified for the view, the UI uses direct calls below
    return accountsAll.filter(a => a.type === type);
  }, [activeTab, accountsAll, ledgerType]);

  // --- DAILY LIST LOGIC ---
  const dailyPurchases = useMemo(() => {
    const list = purchasesAll.filter(p => p.date === dailyDate);
    const grouped: Record<string, { farmerName: string, items: Purchase[], total: number }> = {};
    list.forEach(p => {
      if (!grouped[p.farmerId]) grouped[p.farmerId] = { farmerName: p.farmerName, items: [], total: 0 };
      grouped[p.farmerId].items.push(p);
      grouped[p.farmerId].total += p.total;
    });
    return Object.values(grouped);
  }, [dailyDate, purchasesAll]);

  const dailySales = useMemo(() => {
    const list = salesAll.filter(s => s.date === dailyDate);
    const grouped: Record<string, { customerName: string, items: Sale[], total: number }> = {};
    list.forEach(s => {
      if (!grouped[s.customerId]) grouped[s.customerId] = { customerName: s.customerName, items: [], total: 0 };
      grouped[s.customerId].items.push(s);
      grouped[s.customerId].total += s.total;
    });
    return Object.values(grouped);
  }, [dailyDate, salesAll]);

  // --- SUMMARIES FILTERING ---
  const filteredSummaryCustomers = useMemo(() => {
    return accountsAll
      .filter(a => a.type === 'Customer')
      .filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (a.code || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.balance - a.balance);
  }, [accountsAll, searchTerm]);

  const filteredSummaryFarmers = useMemo(() => {
    return accountsAll
      .filter(a => a.type === 'Farmer')
      .filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (a.code || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.balance - a.balance);
  }, [accountsAll, searchTerm]);

  // --- DAILY LIST FILTERING ---
  const filteredDailyPurchases = useMemo(() => {
    return dailyPurchases.filter(group => 
      group.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.items.some(it => it.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [dailyPurchases, searchTerm]);

  const filteredDailySales = useMemo(() => {
    return dailySales.filter(group => 
      group.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.items.some(it => it.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [dailySales, searchTerm]);

  // --- PROFIT LOGIC ---
  const profitData = profitDataState || { overall: { sales: 0, cost: 0, profit: 0, wastage: 0 }, itemWise: [], farmerWise: [] };

  const getHistoricalBalance = (accountId: string, type: 'Customer' | 'Farmer', date: string) => {
    const account = accountsAll.find(a => a.id === accountId);
    if (!account) return 0;
    
    let balance = account.balance || 0;
    
    if (type === 'Customer') {
      const futureSalesTotal = salesAll.filter(s => s.customerId === accountId && s.date > date).reduce((sum, s) => sum + s.total, 0);
      const futureCashTotal = cashAll.filter(c => c.accountId === accountId && c.type === 'sales' && c.date > date).reduce((sum, c) => sum + c.paidAmount, 0);
      balance = balance - futureSalesTotal + futureCashTotal;
    } else {
      const futurePurchasesTotal = purchasesAll.filter(p => p.farmerId === accountId && p.date > date).reduce((sum, p) => sum + p.total, 0);
      const futureCashTotal = cashAll.filter(c => c.accountId === accountId && c.type === 'purchase' && c.date > date).reduce((sum, c) => sum + c.paidAmount, 0);
      balance = balance - futurePurchasesTotal + futureCashTotal;
    }
    
    return balance;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <h1 className="page-header mb-0">Reports Module</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshData}>
             Refresh Data
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print Reports
          </Button>
          <Button variant="default" size="sm" onClick={handlePrint} className="bg-red-600 hover:bg-red-700 text-white">
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full no-print">
          <TabsTrigger value="ledger">Ledgers</TabsTrigger>
          <TabsTrigger value="summaries">Summaries</TabsTrigger>
          <TabsTrigger value="daily">Daily Lists</TabsTrigger>
          <TabsTrigger value="profit">Profit Engine</TabsTrigger>
          <TabsTrigger value="bill">Bill Print</TabsTrigger>
        </TabsList>

        {/* 1. LEDGER REPORT */}
        <TabsContent value="ledger" className="space-y-4 pt-4">
          <Card className="print:shadow-none print:border-none">
            <CardHeader className="no-print">
              <CardTitle>Account Ledger</CardTitle>
              <CardDescription>View detailed transaction history for any account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select value={ledgerType} onValueChange={(v: any) => { setLedgerType(v); setSelectedAccountId(""); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Customer">Customer Ledger</SelectItem>
                      <SelectItem value="Farmer">Farmer Ledger</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select Account</Label>
                  <SearchableSelect 
                    options={accounts.map(a => ({ label: `${a.code} - ${a.name}`, value: a.id }))}
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                    placeholder="Search account by name or code..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>

              {selectedAccount ? (
                <div className="space-y-4">
                  <div className="text-center py-4 border-b hidden print:block mb-6">
                    <h2 className="text-2xl font-black uppercase tracking-tight">🥬 VEG LEDGER ERP - LEDGER REPORT</h2>
                    <div className="mt-2 text-lg">
                      <p className="font-bold">{selectedAccount.name} ({selectedAccount.code})</p>
                      <p className="text-sm opacity-70 italic">{dateFrom} to {dateTo}</p>
                    </div>
                  </div>

                  <div className="data-table-container overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[120px]">Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">{ledgerType === 'Customer' ? 'Sales' : 'Purchase'}</TableHead>
                          <TableHead className="text-right">Cash Received/Paid</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgerData.map((e, i) => (
                          <TableRow 
                            key={i} 
                            className={`cursor-pointer hover:bg-accent/50 transition-colors ${e.description === 'Opening Balance' ? 'bg-muted/30 font-medium' : ''}`}
                            onDoubleClick={() => {
                              if (e.id && e.type && isOwner) {
                                if (e.type === 'sale') navigate(`/inventory/sales?edit=${e.id}`);
                                else if (e.type === 'purchase') navigate(`/inventory/purchase?edit=${e.id}`);
                                else if (e.type === 'cash') {
                                   const path = ledgerType === 'Customer' ? 'cash-sales' : 'cash-purchase';
                                   navigate(`/inventory/${path}?edit=${e.id}`);
                                }
                              }
                            }}
                            title={e.id ? "Double-click to edit this transaction" : ""}
                          >
                            <TableCell>{e.date}</TableCell>
                            <TableCell>{e.description}</TableCell>
                            <TableCell className="text-right font-mono">{e.credit > 0 ? formatCurrency(e.credit) : '-'}</TableCell>
                            <TableCell className="text-right font-mono">{e.debit > 0 ? formatCurrency(e.debit) : '-'}</TableCell>
                            <TableCell className={`text-right font-mono font-bold ${e.balance > 0 ? 'text-primary' : 'text-destructive'}`}>
                              {formatCurrency(e.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground no-print">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Select an account to view ledger</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2 & 3. SUMMARIES (ENTIRE REPORTS) */}
        <TabsContent value="summaries" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-lg border no-print mb-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Users className="h-5 w-5 text-muted-foreground" />
              <Label className="whitespace-nowrap">Account Type</Label>
              <Select value={summaryType} onValueChange={(v: any) => setSummaryType(v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer">Customer Report</SelectItem>
                  <SelectItem value="Farmer">Farmer Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full sm:max-w-md ml-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder={`Search ${summaryType.toLowerCase()} name or code...`} 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            {summaryType === 'Customer' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Entire Sales Report
                  </CardTitle>
                  <CardDescription>Customer-wise balances sorted by highest</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Last Transaction</TableHead>
                        <TableHead className="text-right">Total Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSummaryCustomers.map(a => (
                        <TableRow 
                          key={a.id} 
                          className="cursor-pointer hover:bg-accent/50 transition-colors group"
                          onDoubleClick={() => {
                            setSelectedAccountId(a.id);
                            setLedgerType("Customer");
                            setActiveTab("ledger");
                          }}
                          title="Double-click to view ledger"
                        >
                          <TableCell className="font-medium group-hover:text-primary transition-colors">{a.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">{formatCurrency(a.balance)}</TableCell>
                        </TableRow>
                      ))}
                      {filteredSummaryCustomers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No customers found matching "{searchTerm}"
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-primary/5 font-bold">
                        <TableCell colSpan={2}>GRAND TOTAL</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(filteredSummaryCustomers.reduce((sum, a) => sum + a.balance, 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {summaryType === 'Farmer' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-orange-600" />
                    Entire Purchase Report
                  </CardTitle>
                  <CardDescription>Farmer-wise pending sorted by highest</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Last Transaction</TableHead>
                        <TableHead className="text-right">Total Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSummaryFarmers.map(a => (
                        <TableRow 
                          key={a.id} 
                          className="cursor-pointer hover:bg-accent/50 transition-colors group"
                          onDoubleClick={() => {
                            setSelectedAccountId(a.id);
                            setLedgerType("Farmer");
                            setActiveTab("ledger");
                          }}
                          title="Double-click to view ledger"
                        >
                          <TableCell className="font-medium group-hover:text-orange-600 transition-colors">{a.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-orange-600">{formatCurrency(a.balance)}</TableCell>
                        </TableRow>
                      ))}
                      {filteredSummaryFarmers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No farmers found matching "{searchTerm}"
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-orange-50 font-bold">
                        <TableCell colSpan={2}>GRAND TOTAL</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(filteredSummaryFarmers.reduce((sum, a) => sum + a.balance, 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 4 & 5. DAILY LISTS */}
        <TabsContent value="daily" className="space-y-6 pt-4">
          <div className="flex flex-col lg:flex-row items-center gap-4 bg-card p-4 rounded-lg border no-print">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Label className="whitespace-nowrap">Select Date</Label>
              <Input type="date" className="w-[180px]" value={dailyDate} onChange={e => setDailyDate(e.target.value)} />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Users className="h-5 w-5 text-muted-foreground" />
              <Label className="whitespace-nowrap">Account Type</Label>
              <Select value={dailyViewType} onValueChange={(v: any) => setDailyViewType(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer">Customers List</SelectItem>
                  <SelectItem value="Farmer">Farmers List</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-full lg:max-w-md lg:ml-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder={`Search ${dailyViewType.toLowerCase()} or item...`} 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            {dailyViewType === 'Farmer' && (
              <Card>
                <CardHeader>
                  <CardTitle>Daily Purchase List</CardTitle>
                  <CardDescription>{dailyDate} - Grouped by Farmer</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                   <div className="space-y-8">
                     {filteredDailyPurchases.length === 0 ? <p className="text-center py-8 text-muted-foreground">No purchases found for this date/search.</p> : null}
                     {filteredDailyPurchases.map((group, idx) => (
                       <div key={idx} className="border-b last:border-0 pb-6">
                         <div className="bg-muted/30 px-6 py-2 flex justify-between items-center">
                            <span className="font-bold text-lg text-primary">{group.farmerName}</span>
                            <span className="text-sm font-medium">Subtotal: {formatCurrency(group.total)}</span>
                         </div>
                         <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="pl-6">Item</TableHead>
                                <TableHead className="text-right">Bags</TableHead>
                                <TableHead className="text-right">Qty (kg)</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">Comm %</TableHead>
                                <TableHead className="text-right pr-6">Net Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.items.map((it, i) => (
                                <TableRow 
                                  key={i} 
                                  className={`group transition-colors ${isOwner ? 'cursor-pointer hover:bg-accent/50' : ''}`}
                                  onDoubleClick={() => isOwner && navigate(`/inventory/purchase?edit=${it.id}`)}
                                  title={isOwner ? "Double-click to edit this purchase" : ""}
                                >
                                  <TableCell className="pl-6 group-hover:text-primary transition-colors font-medium">{it.itemName}</TableCell>
                                  <TableCell className="text-right">{it.bags}</TableCell>
                                  <TableCell className="text-right">{it.quantity}</TableCell>
                                  <TableCell className="text-right">{it.rate}</TableCell>
                                  <TableCell className="text-right">{it.commission}%</TableCell>
                                  <TableCell className="text-right pr-6 font-mono">{formatCurrency(it.total)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                         </Table>
                       </div>
                     ))}
                     {filteredDailyPurchases.length > 0 && (
                       <div className="px-6 py-4 flex justify-between bg-secondary/20 font-bold text-lg">
                          <span>DAILY GRAND TOTAL</span>
                          <span className="font-mono">{formatCurrency(filteredDailyPurchases.reduce((acc, g) => acc + g.total, 0))}</span>
                       </div>
                     )}
                   </div>
                </CardContent>
              </Card>
            )}

            {dailyViewType === 'Customer' && (
              <Card>
                <CardHeader>
                  <CardTitle>Daily Sales List</CardTitle>
                  <CardDescription>{dailyDate} - Grouped by Customer</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                   <div className="space-y-8">
                     {filteredDailySales.length === 0 ? <p className="text-center py-8 text-muted-foreground">No sales found for this date/search.</p> : null}
                     {filteredDailySales.map((group, idx) => (
                       <div key={idx} className="border-b last:border-0 pb-6">
                         <div className="bg-muted/30 px-6 py-2 flex justify-between items-center">
                            <span className="font-bold text-lg text-green-700">{group.customerName}</span>
                            <span className="text-sm font-medium">Subtotal: {formatCurrency(group.total)}</span>
                         </div>
                         <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="pl-6">Farmer Stock</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Qty (kg)</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right pr-6">Net Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.items.map((it, i) => (
                                <TableRow 
                                  key={i}
                                  className={`group transition-colors ${isOwner ? 'cursor-pointer hover:bg-accent/50' : ''}`}
                                  onDoubleClick={() => isOwner && navigate(`/inventory/sales?edit=${it.id}`)}
                                  title={isOwner ? "Double-click to edit this sale" : ""}
                                >
                                  <TableCell className="pl-6 text-sm text-muted-foreground">{it.farmerName}</TableCell>
                                  <TableCell className="group-hover:text-green-700 transition-colors font-medium">{it.itemName}</TableCell>
                                  <TableCell className="text-right">{it.quantity}</TableCell>
                                  <TableCell className="text-right">{it.rate}</TableCell>
                                  <TableCell className="text-right pr-6 font-mono">{formatCurrency(it.total)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                         </Table>
                       </div>
                     ))}
                     {filteredDailySales.length > 0 && (
                       <div className="px-6 py-4 flex justify-between bg-green-50 font-bold text-lg">
                          <span>DAILY GRAND TOTAL</span>
                          <span className="font-mono">{formatCurrency(filteredDailySales.reduce((acc, g) => acc + g.total, 0))}</span>
                       </div>
                     )}
                   </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 7. PROFIT RATIO Engine */}
        <TabsContent value="profit" className="space-y-6 pt-4">
          <div className="flex items-center gap-4 bg-card p-4 rounded-lg border no-print">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <Label>Date For Calculation</Label>
            <Input type="date" className="w-[200px]" value={dailyDate} onChange={e => setDailyDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-green-600 text-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-green-100">Total Sales Value</CardDescription>
                <CardTitle className="text-3xl font-mono">{formatCurrency(profitData.overall.sales)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-slate-700 text-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-300">Total Purchase Cost</CardDescription>
                <CardTitle className="text-3xl font-mono">{formatCurrency(profitData.overall.cost)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-red-600 text-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-red-100">Total Wastage Loss</CardDescription>
                <CardTitle className="text-3xl font-mono">{formatCurrency(profitData.overall.wastage || 0)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-blue-600 text-white shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription className="text-blue-100 font-bold">Estimated Net Profit</CardDescription>
                <CardTitle className="text-3xl font-mono">{formatCurrency(profitData.overall.profit)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[10px] text-blue-100 opacity-80 mt-1 leading-tight">Sales Value - (Purchase Rate - Comm) - Wastage Loss</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Item-wise Analysis</CardTitle>
                <CardDescription>Profit breakdown by vegetable/fruit</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right text-primary">Sales</TableHead>
                      <TableHead className="text-right text-destructive">Cost</TableHead>
                      <TableHead className="text-right font-bold">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitData.itemWise.map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{i.itemName}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{i.qty} kg</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(i.sales)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(i.cost)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold text-green-600">{formatCurrency(i.profit)}</TableCell>
                      </TableRow>
                    ))}
                    {profitData.itemWise.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data for selected date</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Farmer-wise Contribution</CardTitle>
                <CardDescription>Sourcing profit breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right text-primary">Sales</TableHead>
                      <TableHead className="text-right text-destructive">Cost</TableHead>
                      <TableHead className="text-right font-bold">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitData.farmerWise.map((f, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{f.farmerName}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{f.qty} kg</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(f.sales)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(f.cost)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold text-green-600">{formatCurrency(f.profit)}</TableCell>
                      </TableRow>
                    ))}
                    {profitData.farmerWise.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data for selected date</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 6. BILL PRINT SEARCH */}
        <TabsContent value="bill" className="space-y-4 pt-4">
           {/* Bulk Print Section (Hidden on Screen, Visible on Print) */}
           <div className="hidden print:block w-full">
              <div className="grid grid-cols-2 gap-4">
                 {(billViewType === 'Customer' ? filteredDailySales : filteredDailyPurchases).map((group, idx) => (
                    <div key={idx} className={`border border-slate-900 p-2 overflow-hidden break-inside-avoid flex flex-col ${billsPerPage === 2 ? 'h-[10.6in]' : billsPerPage === 4 ? 'h-[5.3in]' : 'h-[3.5in]'}`}>
                       {/* Compact Invoice Metadata (Date only, header removed) */}
                       <div className="flex justify-between border-b border-slate-900 pb-1 mb-1">
                          <p className="text-[10px] font-bold underline uppercase">{billViewType === 'Customer' ? 'Sales Indent' : 'Purchase Memo'}</p>
                          <div className="text-right">
                             <p className="text-[10px] font-bold">INV #{group.items[0].id.split('-')[0].toUpperCase()}</p>
                             <p className="text-[8px]">Date: {dailyDate}</p>
                          </div>
                       </div>

                       {/* Account info */}
                       <div className="flex justify-between mb-2 text-[10px]">
                          <div>
                             <p className="text-[7px] uppercase font-bold text-slate-500">Bill To:</p>
                             <h4 className="font-bold text-[12px]">{billViewType === 'Customer' ? group.customerName : group.farmerName}</h4>
                             <p className="text-[9px]">{accountsAll.find(a => a.id === (billViewType === 'Customer' ? group.items[0].customerId : group.items[0].farmerId))?.place || 'Mandi'}</p>
                             {accountsAll.find(a => a.id === (billViewType === 'Customer' ? group.items[0].customerId : group.items[0].farmerId))?.phone && <p className="text-[8px]">Ph: {accountsAll.find(a => a.id === (billViewType === 'Customer' ? group.items[0].customerId : group.items[0].farmerId))?.phone}</p>}
                          </div>
                       </div>

                       {/* Mini Table */}
                       <div className="flex-1">
                          <table className="w-full text-[10px] border-collapse">
                             <thead className="bg-slate-100 border-y border-slate-900">
                                <tr>
                                   <th className="text-left pl-1">Item</th>
                                   <th className="text-right">Qty</th>
                                   <th className="text-right">Rate</th>
                                   <th className="text-right pr-1">Total</th>
                                </tr>
                             </thead>
                             <tbody>
                                {group.items.slice(0, billsPerPage === 2 ? 30 : (billsPerPage === 4 ? 15 : 8)).map((t, i) => (
                                   <tr key={i} className="border-b border-slate-100">
                                      <td className="font-bold pl-1 uppercase">{t.itemName}</td>
                                      <td className="text-right">{t.quantity}kg</td>
                                      <td className="text-right text-[9px]">{t.rate}</td>
                                      <td className="text-right font-bold pr-1">{t.quantity * t.rate}</td>
                                   </tr>
                                ))}
                                {group.items.length > (billsPerPage === 2 ? 30 : (billsPerPage === 4 ? 15 : 8)) && <tr><td colSpan={4} className="text-center text-[7px] italic border-t">...and {group.items.length - (billsPerPage === 2 ? 30 : (billsPerPage === 4 ? 15 : 8))} more items</td></tr>}
                             </tbody>
                          </table>
                       </div>

                       {/* Compact Mini Totals */}
                       <div className="mt-2 pt-1 border-t-2 border-slate-900">
                          <div className="flex justify-between text-[10px] font-black">
                             <span>NET TOTAL TODAY:</span>
                             <span>{formatCurrency(group.total)}</span>
                          </div>
                          <div className="flex justify-between text-[8px] opacity-60 italic mt-1">
                             <span>Old Pending:</span>
                             <span>{formatCurrency(getHistoricalBalance(billViewType === 'Customer' ? group.items[0].customerId : group.items[0].farmerId, billViewType, dailyDate) - group.total)}</span>
                          </div>
                          <p className="text-[12px] font-black text-right mt-1 border-t border-double border-slate-400 pt-1">
                             GRAND TOTAL: {formatCurrency(getHistoricalBalance(billViewType === 'Customer' ? group.items[0].customerId : group.items[0].farmerId, billViewType, dailyDate))}
                          </p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <Card className="no-print">
             <CardHeader>
               <CardTitle>Bill Generation Engine</CardTitle>
               <CardDescription>Search transactions to generate professional printable bills</CardDescription>
             </CardHeader>
             <CardContent>
                <div className="flex flex-col lg:flex-row items-center gap-4 no-print mb-8">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <Label className="whitespace-nowrap">Transaction Date</Label>
                    <Input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} />
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <Label className="whitespace-nowrap">Account Type</Label>
                    <Select value={billViewType} onValueChange={(v: any) => setBillViewType(v)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Customer">Customer Bills</SelectItem>
                        <SelectItem value="Farmer">Farmer Bills</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <ListOrdered className="h-5 w-5 text-muted-foreground" />
                    <Label className="whitespace-nowrap">Bills Page</Label>
                    <Select value={billsPerPage.toString()} onValueChange={(v: any) => setBillsPerPage(+v as any)}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 Bills</SelectItem>
                        <SelectItem value="4">4 Bills</SelectItem>
                        <SelectItem value="6">6 Bills</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative w-full lg:max-w-md lg:ml-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="search" 
                      placeholder={`Search by ${billViewType.toLowerCase()} name...`} 
                      className="pl-8" 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div>
                  {billViewType === 'Customer' && (
                    <div className="space-y-4">
                      <h3 className="font-bold flex items-center gap-2 text-green-700 underline underline-offset-4"><IndianRupee className="h-4 w-4" /> Customer Sales Bills</h3>
                      <div className="border rounded-lg overflow-hidden h-[500px] overflow-y-auto">
                        {filteredDailySales.length === 0 && <p className="p-12 text-center text-muted-foreground opacity-30">No sales for this date/search</p>}
                        {filteredDailySales.map((group, i) => (
                          <div key={i} className="p-4 border-b last:border-0 flex justify-between items-center bg-card hover:bg-accent/50 transition-colors">
                            <div>
                              <p className="font-bold">{group.customerName}</p>
                              <p className="text-xs text-muted-foreground">{group.items.length} Transactions today</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-1">{group.items[0].customerId.split('-')[0]}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                               <p className="font-mono font-bold text-sm text-green-700">{formatCurrency(group.total)}</p>
                               <BillDialog transactions={group.items} type="Customer" accountsAll={accountsAll} dailyDate={dailyDate} getHistoricalBalance={getHistoricalBalance} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {billViewType === 'Farmer' && (
                    <div className="space-y-4">
                      <h3 className="font-bold flex items-center gap-2 text-orange-700 underline underline-offset-4"><Warehouse className="h-4 w-4" /> Farmer Purchase Bills</h3>
                      <div className="border rounded-lg overflow-hidden h-[500px] overflow-y-auto">
                        {filteredDailyPurchases.length === 0 && <p className="p-12 text-center text-muted-foreground opacity-30">No purchases for this date/search</p>}
                        {filteredDailyPurchases.map((group, i) => (
                          <div key={i} className="p-4 border-b last:border-0 flex justify-between items-center bg-card hover:bg-accent/50 transition-colors">
                            <div>
                              <p className="font-bold">{group.farmerName}</p>
                              <p className="text-xs text-muted-foreground">{group.items.length} Transactions today</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-1">{group.items[0].farmerId.split('-')[0]}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                               <p className="font-mono font-bold text-sm text-orange-600">{formatCurrency(group.total)}</p>
                               <BillDialog transactions={group.items} type="Farmer" accountsAll={accountsAll} dailyDate={dailyDate} getHistoricalBalance={getHistoricalBalance} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
      
      {/* GLOBAL PRINT STYLES */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          header, nav, .sidebar-trigger, .sidebar, .sidebar-content, [role="tablist"] {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
          }
          .data-table-container {
            overflow: visible !important;
          }
          @page {
            size: A4;
            margin: 0.5cm;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 4px !important;
          }
          /* Custom print header for non-bill reports */
          .print-only-header {
             display: block !important;
             text-align: center;
             margin-bottom: 2rem;
             border-bottom: 2px solid #000;
             padding-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

function BillDialog({ transactions, type, accountsAll, dailyDate, getHistoricalBalance }: { transactions: any[], type: 'Customer' | 'Farmer', accountsAll: Account[], dailyDate: string, getHistoricalBalance: (id: string, t: 'Customer'|'Farmer', d: string) => number }) {
  const transaction = transactions[0];
  const account = accountsAll.find(a => a.id === (type === 'Customer' ? transaction.customerId : transaction.farmerId));
  
  if (!account) return null;

  const handlePrint = () => {
    window.print();
  };

  const groupTotal = transactions.reduce((acc, t) => acc + t.total, 0);
  const netTotal = getHistoricalBalance(account.id, type, dailyDate);
  const oldBalance = netTotal - groupTotal;
  const grossValue = transactions.reduce((acc, t) => acc + (t.quantity * t.rate), 0);
  const totalCommission = transactions.reduce((acc, t) => acc + ((t.quantity * t.rate * (t.commission || 0)) / 100), 0);
  const totalDeductions = transactions.reduce((acc, t) => acc + (t.hamali || 0) + (t.expenses || 0), 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-3 text-xs bg-muted/50 hover:bg-secondary">
          <Printer className="h-3 w-3 mr-1" /> View & Print Bill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh] p-0 border-none shadow-none">
        <DialogHeader className="no-print p-6 border-b">
          <DialogTitle>Mandi Bill Preview ({type})</DialogTitle>
          <DialogDescription className="sr-only">Printable invoice preview for the transaction.</DialogDescription>
        </DialogHeader>
        
        <div className="p-8 bg-white text-slate-950 font-serif min-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex justify-between border-b-4 border-slate-900 pb-4 mb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black italic tracking-tighter uppercase">🥬 VEG LEDGER ERP</h1>
              <p className="text-sm font-bold opacity-80 italic">The Premium Mandi Solution</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black bg-slate-900 text-white px-4 py-1 inline-block mb-2">INVOICE #{transaction.id.split('-')[0].toUpperCase()}</h2>
              <p className="text-sm">Date: <strong>{transaction.date}</strong></p>
            </div>
          </div>

          {/* Account Details */}
          <div className="grid grid-cols-2 gap-8 mb-8 pb-4 border-b">
            <div className="space-y-1">
              <p className="text-xs uppercase font-bold text-slate-500">Bill To:</p>
              <h3 className="text-xl font-bold">{account.name}</h3>
              <p className="text-sm">{account.place} | Code: {account.code}</p>
              <p className="text-sm">Ph: {account.phone}</p>
            </div>
            <div className="text-right space-y-1">
               <p className="text-xs uppercase font-bold text-slate-500">Inventory Module:</p>
               <h3 className="text-lg font-bold">{type === 'Customer' ? 'SALES INDENT' : 'PURCHASE MEMO'}</h3>
               <p className="text-sm opacity-70">Agent: Mandi Self-Serve</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="flex-1 mb-8">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-100 uppercase border-y-2 border-slate-900">
                <tr>
                  <th className="py-2 text-left pl-2">Item Description</th>
                  <th className="py-2 text-right">Bags</th>
                  <th className="py-2 text-right">Qty (kg)</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right pr-2">Total Value</th>
                </tr>
              </thead>
              <tbody className="border-b-2 border-slate-900">
                {transactions.map((t, idx) => (
                  <tr key={idx} className="border-b border-slate-200 last:border-0">
                    <td className="py-2 font-bold pl-2">{t.itemName}</td>
                    <td className="py-2 text-right">{t.bags || '-'}</td>
                    <td className="py-2 text-right">{t.quantity} kg</td>
                    <td className="py-3 text-right">{formatCurrency(t.rate)}</td>
                    <td className="py-2 text-right font-bold pr-2">{formatCurrency(t.quantity * t.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-xs">
                <span>Value:</span>
                <span>{formatCurrency(grossValue)}</span>
              </div>
              {type === 'Farmer' && totalCommission > 0 && (
                <div className="flex justify-between text-xs text-destructive font-medium">
                  <span>Commission:</span>
                  <span>- {formatCurrency(totalCommission)}</span>
                </div>
              )}
              {totalDeductions > 0 && (
                <div className="flex justify-between text-xs text-destructive font-medium">
                  <span>Deductions (Hamali + Exp):</span>
                  <span>{type === 'Customer' ? '+' : '-'} {formatCurrency(totalDeductions)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-y border-slate-400 py-1 bg-slate-50">
                <span>Current {type === 'Customer' ? 'Sales' : 'Purchase'}:</span>
                <span>{formatCurrency(groupTotal)}</span>
              </div>
              <div className="flex justify-between text-xs italic">
                <span>Old {type === 'Customer' ? 'Balance' : 'Pending'}:</span>
                <span>{formatCurrency(oldBalance)}</span>
              </div>
              <div className="flex justify-between font-black text-lg pt-2 border-t-2 border-slate-900">
                <span>Net Total:</span>
                <span>{formatCurrency(netTotal)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto border-t pt-8 flex justify-between items-end">
            <div className="space-y-4">
              <div className="text-[10px] text-slate-500 italic max-w-xs">
                * This is a computer generated bill. Please check quantity and item before leaving the Mandi premises. Accurate accounting powered by Mandi ERP.
              </div>
              <div className="text-sm font-bold py-2 px-4 border border-dashed text-slate-400">CUSTOMER SIGNATURE</div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold border-t border-slate-900 pt-1 px-8 uppercase">Authorized Signatory</p>
            </div>
          </div>
        </div>

        <DialogFooter className="no-print p-6 border-t bg-muted/20">
          <Button variant="secondary" onClick={() => (document.querySelector('dialog button[aria-label="Close"]') as any)?.click()}>
            Close Preview
          </Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" /> Download PDF / Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
