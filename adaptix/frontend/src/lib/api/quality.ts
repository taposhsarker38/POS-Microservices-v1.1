import api from "@/lib/api";

export interface QualityStandard {
  id: number;
  product_uuid: string;
  name: string;
  criteria: string;
  tolerance_min?: number;
  tolerance_max?: number;
  is_active: boolean;
}

export interface Inspection {
  id: number;
  reference_type: "INVENTORY" | "PRODUCTION" | "RECEIVING";
  reference_uuid: string;
  inspector_id?: number;
  status: "PENDING" | "PASSED" | "FAILED";
  notes?: string;
  inspection_date: string;
  results: TestResult[];
}

export interface TestResult {
  id: number;
  standard: number;
  measured_value?: number;
  passed: boolean;
  notes?: string;
}

export const qualityApi = {
  // Standards
  getStandards: async () => {
    const response = await api.get<QualityStandard[]>("/quality/standards/");
    return response.data;
  },

  // Inspections
  getInspections: async () => {
    const response = await api.get<Inspection[]>("/quality/inspections/");
    return response.data;
  },

  createInspection: async (data: Partial<Inspection>) => {
    const response = await api.post<Inspection>("/quality/inspections/", data);
    return response.data;
  },

  updateInspectionStatus: async (
    id: number,
    status: "PASSED" | "FAILED",
    notes?: string
  ) => {
    const response = await api.patch<Inspection>(
      `/quality/inspections/${id}/`,
      { status, notes }
    );
    return response.data;
  },
};
