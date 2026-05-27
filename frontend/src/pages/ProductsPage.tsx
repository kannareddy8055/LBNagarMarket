import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  Product,
  getProducts,
  saveProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/store";

export default function ProductsPage() {
  const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const isOwner = user.role === 'owner';

  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ itemName: "", type: "Vegetable" as "Vegetable" | "Fruit" | "Flower" });

  const refresh = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  
  useEffect(() => {
    refresh();
  }, []);

  const filtered = products.filter(p => 
    p.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemName.trim()) { toast.error("Item name is required"); return; }

    try {
      if (editing) {
        await updateProduct(editing.id, { itemName: form.itemName, type: form.type });
        toast.success("Product updated");
      } else {
        await saveProduct(form);
        toast.success("Product created");
      }
      setForm({ itemName: "", type: "Vegetable" });
      setEditing(null);
      setDialogOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({ itemName: p.itemName, type: p.type });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this product?")) {
      try {
        await deleteProduct(id);
        toast.success("Product deleted");
        refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="page-header mb-0">Products</h1>
        <Button onClick={() => { setEditing(null); setForm({ itemName: "", type: "Vegetable" }); setDialogOpen(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search item name, code, or type..." 
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
              <TableHead>Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Type</TableHead>
              {isOwner && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 4 : 3} className="text-center text-muted-foreground py-8">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.code}</TableCell>
                  <TableCell className="font-medium">{p.itemName}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                      {p.type}
                    </span>
                  </TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
            <DialogDescription className="sr-only">Fill out the product catalog details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Item Name *</Label>
              <Input value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} required />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "Vegetable" | "Fruit" | "Flower" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vegetable">Vegetable</SelectItem>
                  <SelectItem value="Fruit">Fruit</SelectItem>
                  <SelectItem value="Flower">Flower</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              {editing ? "Update" : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
