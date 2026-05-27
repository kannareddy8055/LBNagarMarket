import { useState, useEffect } from "react";
import { getAccounts, formatCurrency, Account } from "@/lib/store";
import { Users, IndianRupee, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getAccounts();
        setAccounts(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, []);

  const customers = accounts.filter(a => a.type === 'Customer');
  const farmers = accounts.filter(a => a.type === 'Farmer');
  
  const totalCustomerBalance = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalFarmerPending = farmers.reduce((sum, f) => sum + (f.balance || 0), 0);

  const stats = [
    { label: "Customers", value: customers.length, icon: Users, color: "text-primary" },
    { label: "Farmers", value: farmers.length, icon: Users, color: "text-accent" },
    { label: "Customer Balance", value: formatCurrency(totalCustomerBalance), icon: IndianRupee, color: "text-primary" },
    { label: "Farmer Pending", value: formatCurrency(totalFarmerPending), icon: TrendingUp, color: "text-accent" },
  ];

  return (
    <div>
      <h1 className="page-header">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 form-section">
        <h2 className="text-lg font-semibold mb-2">Welcome to Agri Ledger</h2>
        <p className="text-muted-foreground">
          Use the sidebar to manage accounts, products, purchases, and sales. 
          Start by creating Farmers and Customers in <strong>Masters → Accounts</strong>, 
          then add products in <strong>Masters → Products</strong>.
        </p>
      </div>
    </div>
  );
}
