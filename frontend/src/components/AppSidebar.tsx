import {
  Users, Package, ShoppingCart, Banknote, BarChart3, Warehouse,
  ChevronDown, Receipt, IndianRupee, LogOut, UserCircle, Trash2
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const masterItems = [
  { title: "Accounts", url: "/masters/accounts", icon: Users },
  { title: "Products", url: "/masters/products", icon: Package },
];

const inventoryItems = [
  { title: "Purchase", url: "/inventory/purchase", icon: ShoppingCart },
  { title: "Cash of Purchase", url: "/inventory/cash-purchase", icon: Banknote },
  { title: "Sales", url: "/inventory/sales", icon: Receipt },
  { title: "Cash of Sales", url: "/inventory/cash-sales", icon: IndianRupee },
  { title: "Wastage", url: "/inventory/wastage", icon: Trash2 },
];

const otherItems = [
  { title: "Stock", url: "/stock", icon: Warehouse },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const handleLogout = () => {
    localStorage.removeItem("auth_user");
    window.location.reload();
  };

  const isActive = (path: string) => currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          {!collapsed ? (
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">
              🥬 Mandi Manager
            </h1>
          ) : (
            <span className="text-lg">🥬</span>
          )}
        </div>

        {/* User Profile */}
        {!collapsed && (
          <div className="p-4 border-b border-sidebar-border bg-sidebar-accent/30">
            <div className="flex items-center gap-3">
              <UserCircle className="h-8 w-8 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-bold uppercase">{user.username}</span>
                <span className="text-[10px] uppercase opacity-70 bg-primary/10 text-primary px-1.5 py-0.5 rounded w-fit">{user.role}</span>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard / Admin Control */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    {!collapsed && <span>{user.role === 'admin' ? 'Admin Control' : 'Dashboard'}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.role !== 'admin' && (
          <>
            {/* Masters */}
            <SidebarGroup>
              <SidebarGroupLabel className="font-semibold px-2 py-1 flex items-center justify-between">
                Masters
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {masterItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Inventory */}
            <SidebarGroup>
              <SidebarGroupLabel className="font-semibold px-2 py-1 flex items-center justify-between">
                Inventory
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {inventoryItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Other */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {otherItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Global Footer Actions */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Logout */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
