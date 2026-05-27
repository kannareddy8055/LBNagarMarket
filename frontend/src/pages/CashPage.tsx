import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { Plus, Trash2, Search, Pencil, X } from "lucide-react";
import {
  getAccountsByType,
  getCashEntries,
  saveCashEntry,
  updateCashEntry,
  deleteCashEntry,
  formatCurrency,
  todayStr,
  Account,
  CashEntry,
} from "@/lib/store";

interface CashPageProps {
  type: "purchase" | "sales";
}

export default function CashPage({ type }: CashPageProps) {
  const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const isOwner = user.role === 'owner';

  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: todayStr(),
    accountId: "",
    amount: 0,
    less: 0,
    details: "",
  });

  const accountType = type === "purchase" ? "Farmer" : "Customer";
  const title = type === "purchase" ? "Cash of Purchase (Farmer Payments)" : "Cash of Sales (Customer Payments)";

  const refresh = async () => {
    try {
      const all = await getCashEntries();
      setEntries(all.filter(e => e.type === type));
      const accs = await getAccountsByType(accountType);
      setAccounts(accs);
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  
  useEffect(() => {
    refresh();
  }, [type]);

  const selectedAccount = accounts.find(a => a.id === form.accountId);
  const paidAmount = form.amount + form.less;

  const filteredEntries = entries.filter(e => {
    const matchesDate = e.date === dateFilter;
    const matchesSearch = 
      e.accountName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.details.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId) { toast.error(`Select a ${accountType.toLowerCase()}`); return; }
    if (form.amount <= 0) { toast.error("Amount must be > 0"); return; }

    const entryData = {
      date: form.date,
      accountId: form.accountId,
      accountName: selectedAccount!.name,
      accountCode: selectedAccount!.code,
      type,
      amount: form.amount,
      less: form.less,
      details: form.details,
    };

    try {
      if (editingId) {
        await updateCashEntry(editingId, entryData);
        toast.success("Payment updated");
        setEditingId(null);
      } else {
        await saveCashEntry(entryData);
        toast.success("Payment saved");
      }

      setForm(f => ({ ...f, accountId: "", amount: 0, less: 0, details: "" }));
      setDateFilter(form.date);
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = (e: CashEntry) => {
    setEditingId(e.id);
    setForm({
      date: e.date,
      accountId: e.accountId,
      amount: e.amount,
      less: e.less,
      details: e.details,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this payment? Balance will be reversed.")) {
      try {
        await deleteCashEntry(id);
        toast.success("Payment deleted");
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
        <h1 className="page-header mb-0">{title}</h1>
        {editingId && (
          <Button variant="outline" size="sm" onClick={() => {
            setEditingId(null);
            setForm(f => ({ ...f, accountId: "", amount: 0, less: 0, details: "" }));
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
              <Label>{accountType} *</Label>
              <SearchableSelect
                options={accounts.map(a => ({ label: `${a.code} - ${a.name} (Bal: ${formatCurrency(a.balance)})`, value: a.id }))}
                value={form.accountId}
                onValueChange={v => setForm(f => ({ ...f, accountId: v }))}
                placeholder={`Select ${accountType.toLowerCase()}`}
              />
            </div>
            <div>
              <Label>Amount *</Label>
              <Input type="number" min={0} step="0.01" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} />
            </div>
            <div>
              <Label>Less (Discount)</Label>
              <Input type="number" min={0} step="0.01" value={form.less || ""} onChange={e => setForm(f => ({ ...f, less: +e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Details</Label>
            <Textarea value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} placeholder="Payment details..." />
          </div>

          <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
            <div className="text-sm text-muted-foreground">
              Amount: {formatCurrency(form.amount)} + Less: {formatCurrency(form.less)}
            </div>
            <div className="text-lg font-bold text-primary">Paid: {formatCurrency(paidAmount)}</div>
          </div>

          <Button type="submit" className={editingId ? "w-full sm:w-auto" : ""}>
            {editingId ? <Pencil className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {editingId ? "Update Payment" : "Save Payment"}
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
            placeholder={`Search ${accountType.toLowerCase()} or details...`} 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4 whitespace-nowrap font-semibold text-sm sm:text-base text-primary sm:ml-auto">
          <span>(Total Amount : {formatCurrency(filteredEntries.reduce((sum, e) => sum + e.amount, 0))})</span>
          <span>(Total Less : {formatCurrency(filteredEntries.reduce((sum, e) => sum + e.less, 0))})</span>
        </div>
      </div>

      <div className="data-table-container overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>{accountType}</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Less</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="hidden sm:table-cell">Details</TableHead>
              {isOwner && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 7 : 6} className="text-center text-muted-foreground py-8">
                  No payments for this date.
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((e) => (
                <TableRow key={e.id} className={editingId === e.id ? "bg-primary/5" : ""}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell>{e.accountCode} - {e.accountName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(e.less)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(e.paidAmount)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{e.details}</TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
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
