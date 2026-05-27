import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Pencil, Trash2 } from "lucide-react";
import { getStock, StockEntry, updateStock, deleteStock } from "@/lib/store";

export default function StockPage() {
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<StockEntry | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editRate, setEditRate] = useState<number>(0);

  const refresh = async () => {
    try {
      const data = await getStock();
      setStock(data);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredStock = stock.filter(s => 
    (s.farmerName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.itemName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (s: StockEntry) => {
    setEditingEntry(s);
    setEditQuantity(s.quantity);
    setEditRate(s.avgPurchaseRate || 0);
    setDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    // Manual validation removed as negative stock is allowed now
    try {
      if (editQuantity === 0) {
        await deleteStock(editingEntry.id);
        toast.success("Stock entry removed (quantity 0)");
      } else {
        await updateStock(editingEntry.id, { 
          quantity: editQuantity, 
          avgPurchaseRate: editRate 
        });
        toast.success("Stock updated manually");
      }
      
      setDialogOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteClick = async (s: StockEntry) => {
    if (confirm(`Remove stock for ${s.itemName} from ${s.farmerName}?`)) {
      try {
        await deleteStock(s.id);
        toast.success("Stock entry removed");
        refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  const totalValue = filteredStock.reduce((acc, s) => acc + (s.quantity * (s.avgPurchaseRate || 0)), 0);

  const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const isStaff = user.role === 'staff';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="page-header mb-0">Stock (Farmer-wise)</h1>
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
      </div>
      <div className="data-table-container overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Farmer</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Stock (kg)</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Value</TableHead>
              {!isStaff && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isStaff ? 5 : 6} className="text-center text-muted-foreground py-8">
                  No stock available. Make purchases to add stock.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredStock.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.farmerName}</TableCell>
                    <TableCell>{s.itemName}</TableCell>
                    <TableCell className={`text-right font-mono ${s.quantity < 0 ? 'text-destructive font-bold' : ''}`}>
                      {s.quantity} kg
                      {s.quantity < 0 && <span className="block text-[10px] uppercase font-sans">Negative Stock</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{(s.avgPurchaseRate || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      ₹{(s.quantity * (s.avgPurchaseRate || 0)).toFixed(2)}
                    </TableCell>
                    {!isStaff && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(s)}>
                          <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(s)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={4} className="text-right uppercase tracking-wider">Total Stock Value:</TableCell>
                  <TableCell className="text-right font-mono text-lg">₹{totalValue.toFixed(2)}</TableCell>
                  {!isStaff && <TableCell />}
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Manual Stock</DialogTitle>
            <DialogDescription className="sr-only">Make manual adjustments to the stock level.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <Label>Farmer</Label>
              <Input value={editingEntry?.farmerName || ""} disabled />
            </div>
            <div>
              <Label>Item</Label>
              <Input value={editingEntry?.itemName || ""} disabled />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>New Stock (kg)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={editQuantity || ""} 
                  onChange={(e) => setEditQuantity(+e.target.value)} 
                  required 
                />
              </div>
              <div>
                <Label>Avg Price (₹)</Label>
                <Input 
                  type="number" 
                  min={0} 
                  step="0.01" 
                  value={editRate || ""} 
                  onChange={(e) => setEditRate(+e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Stock</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
