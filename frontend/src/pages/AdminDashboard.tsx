import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Users, ShieldCheck, Trash2, Key, UserCog, Mail } from "lucide-react";
import { AuthUser, getUsers, saveUser, deleteUser, sendCreationOtp } from "@/lib/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminDashboard() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [form, setForm] = useState({ username: "", password: "", role: "owner", tenantId: "", email: "" });
  const [loading, setLoading] = useState(false);
  
  // OTP Verification State
  const [verifying, setVerifying] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [sentOtp, setSentOtp] = useState(""); // For dev display

  const refresh = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const owners = users.filter(u => u.role === 'owner');

  const startVerification = async () => {
    if (!form.username || !form.password || !form.email) return toast.error("User, Pass, and Email are required");
    if (form.role === 'staff' && !form.tenantId) return toast.error("Please select an Owner for this staff");
    
    setLoading(true);
    try {
      const resp = await sendCreationOtp(form.email);
      setSentOtp(resp.otp);
      setVerifying(true);
      toast.info("Verification OTP sent to " + form.email);
    } catch (err: any) {
      toast.error("Failed to send verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput !== sentOtp) return toast.error("Invalid verification code");
    
    setLoading(true);
    try {
      await saveUser(form);
      toast.success(`Identity Verified. New ${form.role} Created!`);
      setForm({ username: "", password: "", role: "owner", tenantId: "", email: "" });
      setVerifying(false);
      setOtpInput("");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteUser(id);
        toast.success("User removed");
        refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8">
      {/* ... (Existing Header) ... */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <ShieldCheck className="h-10 w-10 text-blue-600" />
            Super Admin Control
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Manage mandi business tenants and staff access</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-6 py-3 flex items-center gap-4">
             <div className="p-2 bg-blue-600 rounded-lg text-white">
               <Users className="h-5 w-5" />
             </div>
             <div>
               <div className="text-2xl font-bold text-blue-900">{owners.length}</div>
               <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Shops (Owners)</div>
             </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-6 py-3 flex items-center gap-4">
             <div className="p-2 bg-emerald-600 rounded-lg text-white">
               <UserCog className="h-5 w-5" />
             </div>
             <div>
               <div className="text-2xl font-bold text-emerald-900">{users.filter(u => u.role === 'staff').length}</div>
               <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Staff Users</div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Form */}
        <Card className="lg:col-span-1 border-2 border-slate-100 shadow-xl overflow-hidden self-start">
          <div className="h-1.5 bg-blue-600 w-full" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Register with Email Verif.
            </CardTitle>
            <CardDescription>Add user with mandatory 2FA setup.</CardDescription>
          </CardHeader>
          <CardContent>
            {!verifying ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v, tenantId: "" }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Business Owner (New Shop)</SelectItem>
                      <SelectItem value="staff">Staff Member (Employee)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.role === 'staff' && (
                  <div className="space-y-2">
                    <Label>Link to Owner</Label>
                    <Select value={form.tenantId} onValueChange={v => setForm(f => ({ ...f, tenantId: v }))}>
                      <SelectTrigger className="border-emerald-200">
                        <SelectValue placeholder="Select account owner" />
                      </SelectTrigger>
                      <SelectContent>
                        {owners.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.username.toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2 border-t pt-4">
                  <Label>Username</Label>
                  <Input 
                    placeholder="e.g. lucky_owner"
                    autoComplete="off"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address (for OTP)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                      className="pl-9"
                      placeholder="owner@example.com"
                      autoComplete="off"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input 
                    type="password"
                    placeholder="Set password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <Button onClick={startVerification} className="w-full h-11 bg-blue-600" disabled={loading}>
                  {loading ? "Sending OTP..." : "Send Verification OTP"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleFinalCreate} className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-800">
                  Verifying <strong>{form.email}</strong>. Type the 6-digit code sent to this email inbox.
                </div>
                <div className="space-y-2 text-center">
                  <Label>Verification Code</Label>
                  <Input 
                    className="h-12 text-center text-xl font-bold tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant="outline" onClick={() => {
                    setVerifying(false);
                    setForm({ username: "", password: "", role: "owner", tenantId: "", email: "" });
                  }}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600" disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Create"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="lg:col-span-2 border-slate-100 shadow-lg">
          <CardHeader>
            <CardTitle>System Directory</CardTitle>
            <CardDescription>Managed owners and staff across all businesses.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
             <Table>
               <TableHeader className="bg-slate-50">
                 <TableRow>
                   <TableHead className="pl-6 font-bold text-slate-700">Username</TableHead>
                   <TableHead className="font-bold text-slate-700">Role</TableHead>
                   <TableHead className="font-bold text-slate-700">Linking / Tenant</TableHead>
                   <TableHead className="text-right pr-6 font-bold text-slate-700">Action</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {users.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center py-12 text-slate-400 italic">No users registered yet.</TableCell>
                   </TableRow>
                 ) : users.map(u => (
                   <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors">
                     <TableCell className="pl-6 font-bold text-slate-900">{u.username}</TableCell>
                     <TableCell>
                       <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                         u.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                       }`}>
                         {u.role}
                       </span>
                     </TableCell>
                     <TableCell className="text-xs">
                        {u.role === 'staff' ? (
                          <div className="flex items-center gap-2 text-slate-500">
                             <ShieldCheck className="h-3 w-3 text-emerald-500" />
                             Linked to Tenant ID: {u.tenantId?.slice(-6) || '...'}
                          </div>
                        ) : (
                          <span className="text-blue-500 font-medium">Independent Tenant</span>
                        )}
                     </TableCell>
                     <TableCell className="text-right pr-6">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="text-red-500 hover:text-red-700 hover:bg-red-50"
                         onClick={() => handleDelete(u.id, u.username)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
