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
  status: "PENDING" | "PASSED" | "FAILED" | "REJECTED" | "REWORK";
  inspection_date: string;
  results: TestResult[];
  defect_category?: string;
  defect_category_name?: string;
}

export interface DefectCategory {
  id: string;
  name: string;
  description?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface QCPhoto {
  id: number;
  inspection: number;
  photo_url: string;
  caption?: string;
  uploaded_at: string;
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
    status: string,
    notes?: string,
    defect_category?: string
  ) => {
    const response = await api.patch<Inspection>(
      `/quality/inspections/${id}/`,
      { status, notes, defect_category }
    );
    return response.data;
  },

  // Defect Categories
  getDefectCategories: async () => {
    const response = await api.get<DefectCategory[]>(
      "/quality/defect-categories/"
    );
    return response.data;
  },

  // Photos
  createPhoto: async (data: any) => {
    const response = await api.post<QCPhoto>("/quality/photos/", data);
    return response.data;
  },

  getPhotos: async (inspectionId: string) => {
    const response = await api.get<QCPhoto[]>(
      `/quality/photos/?inspection=${inspectionId}`
    );
    return response.data;
  },
};
