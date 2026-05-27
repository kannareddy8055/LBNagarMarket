import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { Plus, Trash2, Search, Pencil, X } from "lucide-react";
import {
  Sale,
  getAccountsByType,
  getProducts,
  getSales,
  getStock,
  saveSale,
  updateSale,
  deleteSale,
  getStockForFarmerItem,
  formatCurrency,
  todayStr,
  Account,
  Product,
  StockEntry,
} from "@/lib/store";

export default function SalesPage() {
  const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const isOwner = user.role === 'owner';
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Account[]>([]);
  const [farmers, setFarmers] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availableStock, setAvailableStock] = useState(0);
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    date: todayStr(),
    customerId: "",
    farmerId: "",
    itemId: "",
    bags: 0,
    quantity: 0,
    rate: 0,
    hamali: 0,
    expenses: 0,
  });

  const refresh = async () => {
    try {
      const s = await getSales();
      const cu = await getAccountsByType("Customer");
      const fa = await getAccountsByType("Farmer");
      const pr = await getProducts();
      const st = await getStock();
      setSales(s);
      setCustomers(cu);
      setFarmers(fa);
      setProducts(pr);
      setStock(st);
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  
  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && sales.length > 0) {
      const s = sales.find(x => x.id === editId);
      if (s) handleEdit(s);
    }
  }, [sales, searchParams]);

  const resolvedItemId = form.itemId.startsWith("stock:") 
    ? stock.find(s => s.id === form.itemId.split(":")[1])?.itemId || "" 
    : form.itemId;
    
  const selectedItem = products.find(p => p.id === resolvedItemId);

  useEffect(() => {
    const fetchStock = async () => {
      if (form.farmerId && resolvedItemId) {
        const isRateLess = !form.itemId.startsWith("stock:");
        const rate = form.itemId.startsWith("stock:")
          ? stock.find(s => s.id === form.itemId.split(":")[1])?.avgPurchaseRate || 0
          : 0;
        const qty = await getStockForFarmerItem(form.farmerId, resolvedItemId, isRateLess, rate);
        const editingSale = editingId ? sales.find(s => s.id === editingId) : null;
        
        // Match editing sale correctly using rate-less vs standard rate conditions
        const isEditingThisStock = editingSale && 
          editingSale.farmerId === form.farmerId && 
          editingSale.itemId === resolvedItemId &&
          (isRateLess ? editingSale.isRateLess : (!editingSale.isRateLess && editingSale.purchaseRateAtTime === rate));

        setAvailableStock(qty + (isEditingThisStock ? editingSale.quantity : 0));
      } else {
        setAvailableStock(0);
      }
    };
    fetchStock();
  }, [form.farmerId, form.itemId, resolvedItemId, editingId, sales, stock]);

  const selectedCustomer = customers.find(c => c.id === form.customerId);
  const selectedFarmer = farmers.find(f => f.id === form.farmerId);

  const total = form.quantity * form.rate + form.expenses + form.hamali;

  const itemOptions = useMemo(() => {
    const options: { label: string; value: string }[] = [];

    // 1. If a farmer is selected, show THEIR stock first
    if (form.farmerId) {
      const farmerStock = stock.filter(s => s.farmerId === form.farmerId && s.avgPurchaseRate > 0);
      farmerStock.forEach(s => {
        const p = products.find(prod => prod.id === s.itemId);
        const typeInitial = p?.type ? p.type.charAt(0).toUpperCase() : "?";
        options.push({
          label: `${p?.code || "???"} - ${typeInitial} - ${s.itemName} [Rate: ${s.avgPurchaseRate}rs] (${s.quantity}kg available)`,
          value: `stock:${s.id}`
        });
      });
    }

    return options;
  }, [stock, products, form.farmerId]);

  const filteredSales = sales.filter(s => {
    const matchesDate = s.date === dateFilter;
    const matchesSearch = 
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId) { toast.error("Select a customer"); return; }
    if (!form.farmerId) { toast.error("Select a farmer (stock source)"); return; }
    if (!resolvedItemId) { toast.error("Select an item"); return; }
    if (form.quantity <= 0) { toast.error("Quantity must be > 0"); return; }
    if (form.rate <= 0) { toast.error("Rate must be > 0"); return; }

    const isRateLess = !form.itemId.startsWith("stock:");
    const purchaseRateAtTime = form.itemId.startsWith("stock:")
      ? stock.find(s => s.id === form.itemId.split(":")[1])?.avgPurchaseRate || 0
      : 0;

    const saleData = {
      date: form.date,
      customerId: form.customerId,
      customerName: selectedCustomer!.name,
      customerCode: selectedCustomer!.code,
      farmerId: form.farmerId,
      farmerName: selectedFarmer!.name,
      farmerCode: selectedFarmer!.code,
      itemId: resolvedItemId,
      itemName: selectedItem!.itemName,
      bags: form.bags,
      quantity: form.quantity,
      rate: form.rate,
      hamali: form.hamali,
      expenses: form.expenses,
      isRateLess,
      purchaseRateAtTime,
    };

    try {
      let result;
      if (editingId) {
        result = await updateSale(editingId, saleData);
      } else {
        result = await saveSale(saleData);
      }

      if (typeof result === "string") {
        toast.error(result);
        return;
      }

      toast.success(editingId ? "Sale updated" : "Sale saved");
      setEditingId(null);
      setForm(f => ({ ...f, bags: 0, quantity: 0, rate: 0, hamali: 0, expenses: 0 }));
      setDateFilter(form.date);
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    
    // Find the stock entry id if this was a with-rate sale
    const matchingStock = !s.isRateLess 
      ? stock.find(st => st.farmerId === s.farmerId && st.itemId === s.itemId && st.avgPurchaseRate === s.purchaseRateAtTime)
      : null;

    setForm({
      date: s.date,
      customerId: s.customerId,
      farmerId: s.farmerId,
      itemId: matchingStock ? `stock:${matchingStock.id}` : s.itemId,
      bags: s.bags,
      quantity: s.quantity,
      rate: s.rate,
      hamali: s.hamali,
      expenses: s.expenses,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this sale? This will reverse stock and balance.")) {
      try {
        await deleteSale(id);
        toast.success("Sale deleted");
        if (editingId === id) setEditingId(null);
        refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-header mb-0">Sales</h1>
        {editingId && (
          <Button variant="outline" size="sm" onClick={() => {
            setEditingId(null);
            setForm(f => ({ ...f, itemId: "", farmerId: "", bags: 0, quantity: 0, rate: 0, hamali: 0, expenses: 0 }));
          }}>
            <X className="h-4 w-4 mr-1" /> Cancel Edit
          </Button>
        )}
      </div>

      <div className={`form-section mb-6 ${editingId ? 'border-primary ring-1 ring-primary/20' : ''}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label>Customer *</Label>
              <SearchableSelect
                options={customers.map(c => ({ label: `${c.code} - ${c.name}`, value: c.id }))}
                value={form.customerId}
                onValueChange={v => setForm(f => ({ ...f, customerId: v }))}
                placeholder="Select customer"
              />
            </div>
            <div>
              <Label>Farmer (Stock Source) *</Label>
              <SearchableSelect
                options={farmers.map(f => ({ label: `${f.code} - ${f.name}`, value: f.id }))}
                value={form.farmerId}
                onValueChange={v => setForm(f => ({ ...f, farmerId: v }))}
                placeholder="Select farmer"
              />
            </div>
            <div>
              <Label>Item *</Label>
              <SearchableSelect
                options={itemOptions}
                value={form.itemId}
                onValueChange={v => {
                  if (v.startsWith("stock:")) {
                    const stockId = v.split(":")[1];
                    const s = stock.find(entry => entry.id === stockId);
                    if (s) {
                      setForm(f => ({ 
                        ...f, 
                        itemId: v, // Keep the stock:id value to show the detailed label
                        farmerId: s.farmerId, 
                        rate: s.avgPurchaseRate || 0 
                      }));
                    }
                  } else {
                    setForm(f => ({ ...f, itemId: v }));
                  }
                }}
                placeholder="Select item"
              />
            </div>
          </div>

          {form.farmerId && form.itemId && (
            <div className="text-sm bg-secondary/50 rounded px-3 py-2">
              Available Stock: <strong>{availableStock} kg</strong> from {selectedFarmer?.name}
              {editingId && <span className="text-muted-foreground ml-2">(Current sale quantity is added back for validation)</span>}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <Label>Bags</Label>
              <Input type="number" min={0} value={form.bags || ""} onChange={e => setForm(f => ({ ...f, bags: +e.target.value }))} />
            </div>
            <div>
              <Label>Quantity (kg) *</Label>
              <Input type="number" step="0.01" value={form.quantity || ""} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} />
            </div>
            <div>
              <Label>Rate/kg *</Label>
              <Input type="number" min={0} step="0.01" value={form.rate || ""} onChange={e => setForm(f => ({ ...f, rate: +e.target.value }))} />
            </div>
            <div>
              <Label>Hamali</Label>
              <Input type="number" min={0} step="0.01" value={form.hamali || ""} onChange={e => setForm(f => ({ ...f, hamali: +e.target.value }))} />
            </div>
            <div>
              <Label>Expenses</Label>
              <Input type="number" min={0} step="0.01" value={form.expenses || ""} onChange={e => setForm(f => ({ ...f, expenses: +e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
            <div className="text-sm text-muted-foreground">
              Base: {formatCurrency(form.quantity * form.rate)} + Hamali: {formatCurrency(form.hamali)} + Expenses: {formatCurrency(form.expenses)}
            </div>
            <div className="text-lg font-bold text-primary">Total: {formatCurrency(total)}</div>
          </div>

          <Button type="submit" className={editingId ? "w-full sm:w-auto" : ""}>
            {editingId ? <Pencil className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {editingId ? "Update Sale" : "Save Sale"}
          </Button>
        </form>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:items-center">
        <div className="flex items-center gap-2">
          <Label>Filter Date:</Label>
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-auto" />
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search customer, farmer or item..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="whitespace-nowrap font-semibold text-[15px] text-primary sm:ml-4 bg-primary/10 px-3 py-1.5 rounded-md">
          Total Amount: {formatCurrency(filteredSales.reduce((sum, s) => sum + s.total, 0))} | Total Qty: {filteredSales.reduce((sum, s) => sum + s.quantity, 0)} kg
        </div>
      </div>

      <div className="data-table-container overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Farmer</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Bags</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Hamali</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Exp.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              {isOwner && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 10 : 9} className="text-center text-muted-foreground py-8">
                  No sales for this date.
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((s) => (
                <TableRow key={s.id} className={editingId === s.id ? "bg-primary/5" : ""}>
                  <TableCell>{s.customerName}</TableCell>
                  <TableCell>{s.farmerName}</TableCell>
                  <TableCell>{s.itemName}</TableCell>
                  <TableCell className="text-right">{s.bags}</TableCell>
                  <TableCell className="text-right">{s.quantity}</TableCell>
                  <TableCell className="text-right">{s.rate}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell">{s.hamali}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell">{s.expenses}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(s.total)}</TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
