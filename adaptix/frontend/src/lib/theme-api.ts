import api from "./api";

export interface ThemeColors {
  id?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  logo?: string;
  favicon?: string;
}

export const themeApi = {
  getTheme: async (): Promise<ThemeColors> => {
    try {
      const response = await api.get("/company/settings/");
      // Return first result or empty object
      return response.data.results?.[0] || response.data || {};
    } catch (error) {
      console.error("Failed to fetch theme:", error);
      return {};
    }
  },

  updateTheme: async (
    id: string,
    colors: Partial<ThemeColors>
  ): Promise<ThemeColors> => {
    const response = await api.patch(`/company/settings/${id}/`, colors);
    return response.data;
  },
};
