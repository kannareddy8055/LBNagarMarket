import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import AccountsPage from "./pages/AccountsPage";
import ProductsPage from "./pages/ProductsPage";
import PurchasePage from "./pages/PurchasePage";
import SalesPage from "./pages/SalesPage";
import CashPage from "./pages/CashPage";
import StockPage from "./pages/StockPage";
import ReportsPage from "./pages/ReportsPage";
import AdminDashboard from "./pages/AdminDashboard";
import WastagePage from "./pages/WastagePage";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import { useEffect, useState } from "react";
import { AuthUser } from "./lib/store";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("auth_user");
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" richColors />
          <BrowserRouter>
            <Routes>
              <Route path="*" element={<LoginPage />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Admin View
  if (user.role === 'admin') {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" richColors />
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="*" element={<AdminDashboard />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Owner/Staff View
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" richColors />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/masters/accounts" element={<AccountsPage />} />
              <Route path="/masters/products" element={<ProductsPage />} />
              <Route path="/inventory/purchase" element={<PurchasePage />} />
              <Route path="/inventory/cash-purchase" element={<CashPage type="purchase" />} />
              <Route path="/inventory/sales" element={<SalesPage />} />
              <Route path="/inventory/cash-sales" element={<CashPage type="sales" />} />
              <Route path="/inventory/wastage" element={<WastagePage />} />
              <Route path="/stock" element={<StockPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
