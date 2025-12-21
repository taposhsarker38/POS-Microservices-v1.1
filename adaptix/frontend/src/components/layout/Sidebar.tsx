"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  LayoutDashboard,
  Settings,
  Users,
  ShoppingBag,
  Package,
  ShoppingCart,
  Tags,
  Menu,
  Scale,
  UserCog,
  Shield,
  Lock,
  LogOut,
  Contact,
  Ticket, // Add Ticket icon
  Monitor,
  Brain,
  ChartColumn,
  Briefcase,
  Factory,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { getPermissions, isSuperUser } from "@/lib/auth";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    permission: null, // Public (authenticated)
  },
  {
    label: "Customers",
    icon: Contact,
    href: "/dashboard/customers",
    permission: "view_customer",
  },

  {
    label: "Inventory",
    icon: Package,
    href: "/dashboard/inventory",
    permission: "view_inventory",
  },
  {
    label: "Point of Sale",
    icon: ShoppingCart, // Need to import ShoppingCart
    href: "/dashboard/pos",
    permission: "view_pos", // Assuming permission
  },
  {
    label: "Products",
    icon: Package, // Reusing Package icon or maybe Tag if available? Using Package for now conforms to UI commonly.
    href: "/dashboard/products",
    permission: "view_product",
  },
  {
    label: "Categories",
    icon: Package, // Placeholder icon
    href: "/dashboard/categories",
    permission: "view_product",
  },
  {
    label: "Brands",
    icon: Package, // Placeholder icon
    href: "/dashboard/brands",
    permission: "view_product",
  },
  {
    label: "Units",
    icon: Package, // Placeholder icon
    href: "/dashboard/units",
    permission: "view_product",
  },
  {
    label: "HR Portal",
    icon: Users,
    href: "/dashboard/hr",
    permission: "view_hr",
  },
  {
    label: "Projects",
    icon: Briefcase,
    href: "/dashboard/projects",
    permission: "view_project",
  },
  {
    label: "Manufacturing",
    icon: Factory,
    href: "/dashboard/manufacturing",
    permission: "view_manufacturing",
  },
  {
    label: "Quality Control",
    icon: ShieldCheck,
    href: "/dashboard/quality",
    permission: "view_quality",
  },
  {
    label: "Logistics",
    icon: Truck,
    href: "/dashboard/logistics",
    permission: "view_logistics",
  },
  {
    label: "Analytics",
    icon: ChartColumn,
    href: "/dashboard/analytics",
    permission: "view_analytics",
  },
  {
    label: "Accounting", // Rename from Analytics or add new?
    // Wait, Analytics was separate. Accounting was not in sidebar before.
    // There is "Purchase" at 84.
    // Let's add Accounting after HR Portal.
    icon: Scale, // Use Scale for Accounting
    href: "/dashboard/accounting", // Must match page path
    permission: "view_accounting",
  },
  {
    label: "Analytics",
    icon: ShoppingCart,
    href: "/dashboard/purchase",
    permission: "view_purchase",
  },
  {
    label: "Assets",
    icon: Monitor, // Import this
    href: "/dashboard/assets",
    permission: "view_asset",
  },
  {
    label: "Intelligence",
    icon: Brain,
    href: "/dashboard/intelligence",
    permission: "view_forecast", // Assuming this permission eixsts or su will bypass
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
    permission: "view_settings",
  },
];

const adminRoutes = [
  {
    label: "Users",
    icon: UserCog,
    href: "/dashboard/admin/users",
    permission: "view_user",
  },
  {
    label: "Roles",
    icon: Shield,
    href: "/dashboard/admin/roles",
    permission: "view_role",
  },
  {
    label: "Permissions",
    icon: Lock,
    href: "/dashboard/admin/permissions",
    permission: "view_permission",
  },
];

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuper, setIsSuper] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const perms = getPermissions();
    setPermissions(perms);
    setIsSuper(isSuperUser());
  }, []);

  // Show all routes if no specific permission system set up yet, OR strict check?
  // Let's implement strict check. If permission is null, allow. If set, check includes.
  // Exception: Superusers might have "all". For now, we assume explicit permissions.
  // Actually, for dev convinience, if permissions is empty, maybe show Dashboard only?
  // Let's assume the user has at least 'dashboard' access.

  const filterRoutes = (list: typeof routes) => {
    if (!isClient) return []; // Avoid hydration mismatch
    if (isSuper) return list; // Superuser sees all
    return list.filter((route) => {
      if (!route.permission) return true;
      return permissions.includes(route.permission);
    });
  };

  const visibleRoutes = filterRoutes(routes);
  const visibleAdminRoutes = filterRoutes(adminRoutes);

  return (
    <div
      className={cn("flex flex-col h-full bg-slate-900 text-white", className)}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Adaptix</h1>
            <p className="text-xs text-slate-400">Enterprise Suite</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {visibleRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                pathname === route.href
                  ? "bg-violet-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <route.icon className="h-5 w-5" />
              <span>{route.label}</span>
            </Link>
          ))}
        </div>

        {visibleAdminRoutes.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Administration
            </h3>
            <div className="space-y-1">
              {visibleAdminRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === route.href
                      ? "bg-violet-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <route.icon className="h-5 w-5" />
                  <span>{route.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/login";
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 bg-slate-900 border-r-slate-800 text-white w-64"
      >
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
