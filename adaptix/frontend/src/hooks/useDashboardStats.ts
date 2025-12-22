import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { DashboardAnalytics, Order, Stock } from "@/lib/types";

interface DashboardStats {
  analytics: DashboardAnalytics;
  recentOrders: Order[];
  lowStockCount: number;
  highRiskCount: number; // AI-detected risks
  manufacturingStats: {
    total_produced: number;
    total_defects: number;
    efficiency_rate: number;
  };
  isLoading: boolean;
  error: any;
}

export const useDashboardStats = (): DashboardStats => {
  // ... existing queries ...
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: async () => {
      const res = await api.get("/reporting/analytics/dashboard/");
      return res.data;
    },
    initialData: { total_revenue: 0, total_transactions: 0, top_products: [] },
  });

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
  } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const res = await api.get("/pos/orders/?limit=5&ordering=-created_at");
      return res.data.results || res.data;
    },
    initialData: [],
  });

  const {
    data: stockData,
    isLoading: stockLoading,
    error: stockError,
  } = useQuery({
    queryKey: ["all-stocks"],
    queryFn: async () => {
      const res = await api.get("/inventory/stocks/?limit=100");
      return res.data.results || res.data;
    },
    initialData: [],
  });

  // 4. Fetch AI Intelligence Insights
  const { data: intelData, isLoading: intelLoading } = useQuery({
    queryKey: ["dashboard-intelligence"],
    queryFn: async () => {
      const res = await api.get("/intelligence/inventory/opt/");
      return res.data;
    },
    initialData: [],
  });

  // 5. Fetch Manufacturing Stats
  const { data: mfgData, isLoading: mfgLoading } = useQuery({
    queryKey: ["dashboard-manufacturing"],
    queryFn: async () => {
      const res = await api.get("/reporting/manufacturing/machine_stats/");
      return res.data;
    },
    initialData: { total_produced: 0, total_defects: 0, efficiency_rate: 100 },
  });

  // Calculate Low Stock
  const lowStockCount = (stockData as Stock[]).filter((s) => {
    const qty = parseFloat(s.quantity);
    const reorder = parseFloat(s.reorder_level);
    return qty <= reorder;
  }).length;

  // Calculate AI High Risk
  const highRiskCount = (intelData as any[]).filter(
    (item) => item.stockout_risk_score > 70
  ).length;

  return {
    analytics: analyticsData,
    recentOrders: ordersData,
    lowStockCount,
    highRiskCount,
    manufacturingStats: mfgData,
    isLoading:
      analyticsLoading ||
      ordersLoading ||
      stockLoading ||
      intelLoading ||
      mfgLoading,
    error: analyticsError || ordersError || stockError,
  };
};
