
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { login, verifyOtp } from "@/lib/store";
import { toast } from "sonner";
import { Lock, Mail, ArrowLeft, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInitialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await login({ username, password });
      if (resp.needsOTP) {
        setUserId(resp.userId);
        setStep(2);
        toast.info("OTP sent to your registered email");
      } else {
        // Super Admin or direct login
        localStorage.setItem("auth_user", JSON.stringify(resp));
        toast.success("Welcome, Super Admin");
        navigate("/");
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Enter valid 6-digit OTP");
    
    setLoading(true);
    try {
      const user = await verifyOtp({ userId, otp });
      localStorage.setItem("auth_user", JSON.stringify(user));
      toast.success("Identity Verified. Welcome!");
      navigate("/");
      window.location.reload();
    } catch (err: any) {
      toast.error("Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary overflow-hidden">
        <div className="bg-primary/5 p-8 text-center border-b border-primary/10">
           <div className="mx-auto bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center mb-4 transform rotate-12">
             {step === 1 ? <Lock className="text-primary h-8 w-8 -rotate-12" /> : <Mail className="text-primary h-8 w-8 -rotate-12" />}
           </div>
           <CardTitle className="text-3xl font-black tracking-tight text-primary">MANDI PRO</CardTitle>
           <CardDescription className="text-slate-500 font-medium">Enterprise Management System</CardDescription>
        </div>

        <CardContent className="p-8">
          {step === 1 ? (
            <form onSubmit={handleInitialLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  autoComplete="username"
                  placeholder="Enter username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                  className="h-12 border-slate-200 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  autoComplete="current-password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  className="h-12 border-slate-200 focus:ring-primary"
                />
              </div>
              <Button type="submit" className="w-full font-bold h-12 text-lg flex gap-2" disabled={loading}>
                {loading ? "Authenticating..." : "Continue"}
                {!loading && <ArrowRight className="h-5 w-5" />}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="text-center space-y-2 mb-6">
                <div className="text-lg font-bold">Verification Code</div>
                <p className="text-sm text-slate-500">We've sent a 6-digit code to your email. Check your inbox.</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="otp">Enter 6-Digit OTP</Label>
                <Input 
                  id="otp" 
                  placeholder="000 000" 
                  maxLength={6}
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  required 
                  className="h-14 text-center text-2xl font-black tracking-[0.5em] border-primary/30 focus:border-primary"
                />
              </div>

              <div className="space-y-3">
                <Button type="submit" className="w-full font-bold h-12 text-lg bg-primary hover:bg-primary/90" disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Login"}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full flex gap-2 text-slate-500" 
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Button>
              </div>
            </form>
          )}
          
          <div className="mt-8 text-center">
             <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Secured by 2FA Technology</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
