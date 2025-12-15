import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { DashboardAnalytics, Order, Stock } from "@/lib/types";

interface DashboardStats {
  analytics: DashboardAnalytics;
  recentOrders: Order[];
  lowStockCount: number;
  isLoading: boolean;
  error: any;
}

export const useDashboardStats = (): DashboardStats => {
  // 1. Fetch Analytics (Revenue, Transactions)
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: async () => {
      const res = await api.get("/reporting/analytics/dashboard/");
      return res.data; // Assuming direct response or adjust if wrapped
    },
    // Fallback if service not ready
    initialData: { total_revenue: 0, total_transactions: 0, top_products: [] },
  });

  // 2. Fetch Recent Orders (Limit 5)
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
  } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const res = await api.get("/pos/orders/?limit=5&ordering=-created_at");
      return res.data.results || res.data; // DRF pagination
    },
    initialData: [],
  });

  // 3. Fetch Low Stock (Client-side calc for now)
  const {
    data: stockData,
    isLoading: stockLoading,
    error: stockError,
  } = useQuery({
    queryKey: ["all-stocks"], // potentially heavy, optimize later with filter API
    queryFn: async () => {
      // Fetching all might be heavy. Ideally /inventory/stock/?low_stock=true
      // For now, let's just assume we fetch a reasonable page size or add a custom filter later.
      // Let's fetch page 1 size 100 as a sample indicator.
      const res = await api.get("/inventory/stock/?limit=100");
      return res.data.results || res.data;
    },
    initialData: [],
  });

  // Calculate Low Stock
  // Need to parse decimal strings to numbers
  const lowStockCount = (stockData as Stock[]).filter((s) => {
    const qty = parseFloat(s.quantity);
    const reorder = parseFloat(s.reorder_level);
    return qty <= reorder;
  }).length;

  return {
    analytics: analyticsData,
    recentOrders: ordersData,
    lowStockCount,
    isLoading: analyticsLoading || ordersLoading || stockLoading,
    error: analyticsError || ordersError || stockError,
  };
};
