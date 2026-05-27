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
  Account,
  getAccounts,
  saveAccount,
  updateAccount,
  deleteAccount,
  formatCurrency,
} from "@/lib/store";

export default function AccountsPage() {
  const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const isOwner = user.role === 'owner';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", place: "", balance: "" as string | number, type: "Customer" as "Customer" | "Farmer" });

  const refresh = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  
  useEffect(() => {
    refresh();
  }, []);

  const filtered = accounts.filter(a => {
    const matchesType = filterType === "all" || a.type === filterType;
    const matchesSearch = 
      (a.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (a.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.place || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.phone || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }

    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, { name: form.name, phone: form.phone, place: form.place, balance: Number(form.balance) || 0 });
        toast.success("Account updated");
      } else {
        const payload = { ...form, balance: Number(form.balance) || 0 };
        await saveAccount(payload);
        toast.success("Account created");
      }
      setForm({ name: "", phone: "", place: "", balance: "", type: "Customer" });
      setEditingAccount(null);
      setDialogOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setForm({ name: account.name, phone: account.phone, place: account.place, balance: account.balance ?? "", type: account.type });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this account?")) {
      try {
        await deleteAccount(id);
        toast.success("Account deleted");
        refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  const openNew = (type: "Customer" | "Farmer") => {
    setEditingAccount(null);
    setForm({ name: "", phone: "", place: "", balance: "", type });
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="page-header mb-0">Accounts</h1>
        <div className="flex gap-2">
          <Button onClick={() => openNew("Customer")} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Customer
          </Button>
          <Button onClick={() => openNew("Farmer")} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Farmer
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Customer">Customers</SelectItem>
            <SelectItem value="Farmer">Farmers</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search name, code, phone, or place..." 
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
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead className="hidden md:table-cell">Place</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No accounts found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-mono text-sm">{account.code}</TableCell>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{account.phone}</TableCell>
                  <TableCell className="hidden md:table-cell">{account.place}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      account.type === 'Customer' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-accent/10 text-accent'
                    }`}>
                      {account.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(account.balance)}</TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)}>
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
            <DialogTitle>{editingAccount ? "Edit Account" : `New ${form.type}`}</DialogTitle>
            <DialogDescription className="sr-only">Fill out the details for this account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Place</Label>
              <Input value={form.place} onChange={e => setForm(f => ({ ...f, place: e.target.value }))} />
            </div>
            <div>
              <Label>Opening Balance / Pending Amount</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={form.balance} 
                onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} 
                placeholder="0.00" 
              />
            </div>
            <Button type="submit" className="w-full">
              {editingAccount ? "Update" : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
