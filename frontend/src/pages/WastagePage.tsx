import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { Plus, Trash2, Search } from "lucide-react";
import {
  WastageEntry,
  getAccountsByType,
  getProducts,
  getWastage,
  saveWastage,
  deleteWastage,
  getStockForFarmerItem,
  formatCurrency,
  todayStr,
  Account,
  Product,
} from "@/lib/store";

export default function WastagePage() {
  const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const isOwner = user.role === 'owner';
  
  const [wastages, setWastages] = useState<WastageEntry[]>([]);
  const [farmers, setFarmers] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [searchTerm, setSearchTerm] = useState("");
  const [availableStock, setAvailableStock] = useState(0);

  const [form, setForm] = useState({
    date: todayStr(),
    farmerId: "",
    itemId: "",
    quantity: 0,
  });

  const refresh = async () => {
    try {
      const [w, f, p] = await Promise.all([
        getWastage(),
        getAccountsByType("Farmer"),
        getProducts()
      ]);
      setWastages(w);
      setFarmers(f);
      setProducts(p);
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  
  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const fetchStock = async () => {
      if (form.farmerId && form.itemId) {
        const qty = await getStockForFarmerItem(form.farmerId, form.itemId);
        setAvailableStock(qty);
      } else {
        setAvailableStock(0);
      }
    };
    fetchStock();
  }, [form.farmerId, form.itemId]);

  const selectedFarmer = farmers.find(f => f.id === form.farmerId);
  const selectedItem = products.find(p => p.id === form.itemId);

  const filteredWastages = wastages.filter(w => {
    const matchesDate = w.date === dateFilter;
    const matchesSearch = 
      w.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.farmerId) { toast.error("Select a farmer (stock source)"); return; }
    if (!form.itemId) { toast.error("Select an item"); return; }
    if (form.quantity <= 0) { toast.error("Quantity must be > 0"); return; }

    const wastageData = {
      date: form.date,
      farmerId: form.farmerId,
      farmerName: selectedFarmer!.name,
      itemId: form.itemId,
      itemName: selectedItem!.itemName,
      quantity: form.quantity,
    };

    try {
      const result = await saveWastage(wastageData);
      if (typeof result === "string") {
        toast.error(result);
        return;
      }
      toast.success("Wastage recorded successfully");
      setForm(f => ({ ...f, quantity: 0 }));
      setDateFilter(form.date);
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this wastage entry? This will reverse the stock deduction.")) {
      try {
        await deleteWastage(id);
        toast.success("Wastage entry deleted");
        refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-header mb-0">Inventory Wastage</h1>
      </div>

      <div className="form-section mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
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
                options={products.map(p => ({ label: `${p.code} - ${p.itemName}`, value: p.id }))}
                value={form.itemId}
                onValueChange={v => setForm(f => ({ ...f, itemId: v }))}
                placeholder="Select item"
              />
            </div>
            <div>
              <Label>Wastage Quantity (kg) *</Label>
              <Input type="number" min={0} step="0.01" value={form.quantity || ""} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} />
            </div>
          </div>

          {form.farmerId && form.itemId && (
            <div className="text-sm bg-secondary/50 rounded px-3 py-2">
              Available Stock: <strong>{availableStock} kg</strong> from {selectedFarmer?.name}
            </div>
          )}

          <Button type="submit">
            <Plus className="h-4 w-4 mr-1" /> Record Wastage
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
        <div className="whitespace-nowrap font-semibold text-[15px] text-destructive sm:ml-4 bg-destructive/10 px-3 py-1.5 rounded-md">
          Total Loss: {formatCurrency(filteredWastages.reduce((sum, w) => sum + w.totalLoss, 0))} | Total Qty: {filteredWastages.reduce((sum, w) => sum + w.quantity, 0)} kg
        </div>
      </div>

      <div className="data-table-container overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Farmer</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty Loss</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Purchase Rate</TableHead>
              <TableHead className="text-right">Total Loss Amount</TableHead>
              {isOwner && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWastages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 6 : 5} className="text-center text-muted-foreground py-8">
                  No wastage records for this date.
                </TableCell>
              </TableRow>
            ) : (
              filteredWastages.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>{w.farmerName}</TableCell>
                  <TableCell>{w.itemName}</TableCell>
                  <TableCell className="text-right text-destructive font-bold">{w.quantity} kg</TableCell>
                  <TableCell className="text-right hidden sm:table-cell text-muted-foreground">{formatCurrency(w.purchaseRateAtTime)}</TableCell>
                  <TableCell className="text-right font-mono font-medium text-destructive">{formatCurrency(w.totalLoss)}</TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
