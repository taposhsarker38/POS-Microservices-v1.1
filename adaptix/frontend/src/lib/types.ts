export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: string;
  cost: string;
  quantity: string;
  alert_quantity: string;
  attributes: Record<string, any>;
}

export interface Product {
  id: string;
  name: string;
  product_type: "standard" | "service" | "combo" | "consumable";
  category?: string;
  brand?: string;
  unit?: string;

  category_name?: string;
  brand_name?: string;
  unit_name?: string;

  thumbnail?: string;
  description?: string;

  variants: ProductVariant[];

  tax_type?: string;
  tax_method: "exclusive" | "inclusive";
}

export interface Brand {
  id: string;
  name: string;
  logo?: string;
}

export interface Category {
  id: string;
  name: string;
  parent?: string;
  icon?: string;
}

export interface CartItem extends ProductVariant {
  productName: string;
  productImage?: string;
  taxMethod: "exclusive" | "inclusive";
  cartQuantity: number;
}

export interface Department {
  id: string;
  name: string;
}

export interface Designation {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department?: string; // ID
  department_name?: string; // Optional expansion
  designation?: string; // ID
  designation_name?: string; // Optional expansion
  joining_date: string;
  is_active: boolean;
  thumbnail?: string; // Optional avatar
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  days_allowed_per_year: number;
}

export interface LeaveApplication {
  id: string;
  employee: string; // ID
  employee_name?: string;
  leave_type: string; // ID
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  days?: number;
}

export interface Warehouse {
  id: string;
  name: string;
  type: string;
}

export interface Stock {
  id: string;
  warehouse: string; // ID
  product_uuid: string;
  product_name?: string; // Hydrated
  quantity: string; // Decimal
  reorder_level: string; // Decimal
  avg_cost: string; // Decimal
}

export interface StockTransaction {
  id: string;
  stock: string;
  type:
    | "in"
    | "out"
    | "transfer_in"
    | "transfer_out"
    | "adjustment_add"
    | "adjustment_sub"
    | "return";
  quantity_change: string;
  balance_after: string;
  reference_no?: string;
  notes?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name?: string;
  grand_total: string;
  status: "pending" | "completed" | "cancelled";
  created_at: string;
  items_count?: number; // derived or from serializer
}

export interface DashboardAnalytics {
  total_revenue: number;
  total_transactions: number;
  top_products: Array<{
    product_name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
}
