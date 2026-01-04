import api from "@/lib/api";

export interface WorkCenter {
  id: number;
  name: string;
  code: string;
  description: string;
  capacity_per_day: string;
}

export interface BillOfMaterial {
  id: number;
  product_uuid: string;
  name: string;
  quantity: string;
  version: string;
  items: BOMItem[];
}

export interface BOMItem {
  id: number;
  component_uuid: string;
  quantity: string;
}

export interface ProductionOrder {
  id: number;
  work_center: number | null;
  work_center_name?: string;
  product_uuid: string;
  bom: number | null;
  bom_name?: string;
  quantity_planned: string;
  quantity_produced: string;
  status:
    | "DRAFT"
    | "CONFIRMED"
    | "IN_PROGRESS"
    | "QUALITY_CHECK"
    | "COMPLETED"
    | "CANCELLED";
  start_date: string | null;
  due_date: string | null;
  notes: string;
}

export const manufacturingApi = {
  // Work Centers
  getWorkCenters: async () => {
    const response = await api.get<any>("/manufacturing/work-centers/");
    return response.data.results || response.data;
  },

  createWorkCenter: async (data: Partial<WorkCenter>) => {
    const response = await api.post<WorkCenter>(
      "/manufacturing/work-centers/",
      data
    );
    return response.data;
  },

  updateWorkCenter: async (id: number, data: Partial<WorkCenter>) => {
    const response = await api.patch<WorkCenter>(
      `/manufacturing/work-centers/${id}/`,
      data
    );
    return response.data;
  },

  // BOMs
  getBOMs: async () => {
    const response = await api.get<any>("/manufacturing/boms/");
    return response.data.results || response.data;
  },

  // Production Orders
  getOrders: async () => {
    const response = await api.get<any>("/manufacturing/orders/");
    return response.data.results || response.data;
  },

  createOrder: async (data: Partial<ProductionOrder>) => {
    const response = await api.post<ProductionOrder>(
      "/manufacturing/orders/",
      data
    );
    return response.data;
  },

  updateOrder: async (id: number, data: Partial<ProductionOrder>) => {
    const response = await api.patch<ProductionOrder>(
      `/manufacturing/orders/${id}/`,
      data
    );
    return response.data;
  },

  checkAvailability: async (payload: {
    bom_id?: number;
    quantity?: number;
    order_id?: number;
  }) => {
    const response = await api.post<{
      status: "AVAILABLE" | "SHORTAGE";
      can_produce: boolean;
      shortages?: {
        component_uuid: string;
        needed: number;
        available: number;
        shortage: number;
      }[];
    }>("/manufacturing/orders/check-availability/", payload);
    return response.data;
  },
};
