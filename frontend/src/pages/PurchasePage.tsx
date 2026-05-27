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
  Purchase,
  getAccountsByType,
  getProducts,
  getPurchases,
  savePurchase,
  updatePurchase,
  deletePurchase,
  formatCurrency,
  todayStr,
  Account,
  Product,
} from "@/lib/store";

export default function PurchasePage() {
  const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const isOwner = user.role === 'owner';

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [farmers, setFarmers] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    date: todayStr(),
    farmerId: "",
    itemId: "",
    bags: 0,
    quantity: 0,
    rate: 0,
    commission: 0,
    hamali: 0,
    expenses: 0,
  });

  const refresh = async () => {
    try {
      const p = await getPurchases();
      const f = await getAccountsByType("Farmer");
      const pr = await getProducts();
      setPurchases(p);
      setFarmers(f);
      setProducts(pr);
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  
  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && purchases.length > 0) {
      const p = purchases.find(x => x.id === editId);
      if (p) handleEdit(p);
    }
  }, [purchases, searchParams]);

  const selectedFarmer = farmers.find(f => f.id === form.farmerId);
  const selectedItem = products.find(p => p.id === form.itemId);

  const commissionAmount = (form.quantity * form.rate * form.commission) / 100;
  const total = form.quantity * form.rate - commissionAmount - form.expenses - form.hamali;

  const filteredPurchases = purchases.filter(p => {
    const matchesDate = p.date === dateFilter;
    const matchesSearch = 
      p.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.farmerId) { toast.error("Select a farmer"); return; }
    if (!form.itemId) { toast.error("Select an item"); return; }
    if (form.quantity <= 0) { toast.error("Quantity must be > 0"); return; }
    if (form.rate <= 0) { toast.error("Rate must be > 0"); return; }

    const purchaseData = {
      date: form.date,
      farmerId: form.farmerId,
      farmerName: selectedFarmer!.name,
      farmerCode: selectedFarmer!.code,
      itemId: form.itemId,
      itemName: selectedItem!.itemName,
      bags: form.bags,
      quantity: form.quantity,
      rate: form.rate,
      commission: form.commission,
      hamali: form.hamali,
      expenses: form.expenses,
    };

    try {
      if (editingId) {
        await updatePurchase(editingId, purchaseData);
        toast.success("Purchase updated");
        setEditingId(null);
      } else {
        await savePurchase(purchaseData);
        toast.success("Purchase saved");
      }

      setForm(f => ({ ...f, bags: 0, quantity: 0, rate: 0, commission: f.commission, hamali: 0, expenses: 0 }));
      setDateFilter(form.date);
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = (p: Purchase) => {
    setEditingId(p.id);
    setForm({
      date: p.date,
      farmerId: p.farmerId,
      itemId: p.itemId,
      bags: p.bags,
      quantity: p.quantity,
      rate: p.rate,
      commission: p.commission,
      hamali: p.hamali,
      expenses: p.expenses,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this purchase? This will reverse stock and balance.")) {
      try {
        await deletePurchase(id);
        toast.success("Purchase deleted");
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
        <h1 className="page-header mb-0">Purchase (Farmer Entry)</h1>
        {editingId && (
          <Button variant="outline" size="sm" onClick={() => {
            setEditingId(null);
            setForm(f => ({ ...f, itemId: "", bags: 0, quantity: 0, rate: 0, hamali: 0, expenses: 0 }));
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
              <Label>Farmer *</Label>
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
                options={products.map(p => ({ label: `${p.code} - ${p.itemName}`, value: p.id }))}
                value={form.itemId}
                onValueChange={v => setForm(f => ({ ...f, itemId: v }))}
                placeholder="Select item"
              />
            </div>
            <div>
              <Label>Bags</Label>
              <Input type="number" min={0} value={form.bags || ""} onChange={e => setForm(f => ({ ...f, bags: +e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <Label>Quantity (kg) *</Label>
              <Input type="number" min={0} step="0.01" value={form.quantity || ""} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} />
            </div>
            <div>
              <Label>Rate/kg *</Label>
              <Input type="number" min={0} step="0.01" value={form.rate || ""} onChange={e => setForm(f => ({ ...f, rate: +e.target.value }))} />
            </div>
            <div>
              <Label>Commission (%)</Label>
              <Input type="number" min={0} max={100} step="0.1" value={form.commission || ""} onChange={e => setForm(f => ({ ...f, commission: +e.target.value }))} />
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
              Gross: {formatCurrency(form.quantity * form.rate)} | 
              Commission: {formatCurrency(commissionAmount)} | 
              Deductions: {formatCurrency(form.expenses + form.hamali)}
            </div>
            <div className="text-lg font-bold text-primary">Total: {formatCurrency(total)}</div>
          </div>

          <Button type="submit" className={editingId ? "w-full sm:w-auto" : ""}>
            {editingId ? <Pencil className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {editingId ? "Update Purchase" : "Save Purchase"}
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
            placeholder="Search farmer or item..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="whitespace-nowrap font-semibold text-[15px] text-primary sm:ml-4 bg-primary/10 px-3 py-1.5 rounded-md">
          Total Amount: {formatCurrency(filteredPurchases.reduce((sum, p) => sum + p.total, 0))} | Total Qty: {filteredPurchases.reduce((sum, p) => sum + p.quantity, 0)} kg
        </div>
      </div>

      <div className="data-table-container overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Farmer</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Bags</TableHead>
              <TableHead className="text-right">Qty (kg)</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Comm%</TableHead>
              <TableHead className="text-right hidden md:table-cell">Hamali</TableHead>
              <TableHead className="text-right hidden md:table-cell">Expenses</TableHead>
              <TableHead className="text-right">Total</TableHead>
              {isOwner && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 10 : 9} className="text-center text-muted-foreground py-8">
                  No purchases for this date.
                </TableCell>
              </TableRow>
            ) : (
              filteredPurchases.map((p) => (
                <TableRow key={p.id} className={editingId === p.id ? "bg-primary/5" : ""}>
                  <TableCell>{p.farmerCode} - {p.farmerName}</TableCell>
                  <TableCell>{p.itemName}</TableCell>
                  <TableCell className="text-right">{p.bags}</TableCell>
                  <TableCell className="text-right">{p.quantity}</TableCell>
                  <TableCell className="text-right">{p.rate}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell">{p.commission}%</TableCell>
                  <TableCell className="text-right hidden md:table-cell">{p.hamali}</TableCell>
                  <TableCell className="text-right hidden md:table-cell">{p.expenses}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(p.total)}</TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
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
