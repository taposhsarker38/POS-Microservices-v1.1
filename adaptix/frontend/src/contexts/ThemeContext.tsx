"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { themeApi, ThemeColors } from "@/lib/theme-api";

const DEFAULT_THEME: ThemeColors = {
  primary_color: "#8b5cf6", // violet-500
  secondary_color: "#a78bfa", // violet-400
  accent_color: "#06b6d4", // cyan-500
  background_color: "#f8fafc", // slate-50
  text_color: "#0f172a", // slate-900
};

interface ThemeContextType {
  theme: ThemeColors;
  updateTheme: (colors: Partial<ThemeColors>) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeColors>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch theme on mount
    const loadTheme = async () => {
      try {
        const data = await themeApi.getTheme();
        const mergedTheme = { ...DEFAULT_THEME, ...data };
        setTheme(mergedTheme);
        applyThemeToDOM(mergedTheme);
      } catch (err) {
        console.error("Failed to load theme:", err);
        // Use default theme
        applyThemeToDOM(DEFAULT_THEME);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, []);

  const updateTheme = async (colors: Partial<ThemeColors>) => {
    if (!theme.id) {
      console.error("Cannot update theme: No theme ID found");
      return;
    }

    try {
      const updated = await themeApi.updateTheme(theme.id, colors);
      const mergedTheme = { ...DEFAULT_THEME, ...updated };
      setTheme(mergedTheme);
      applyThemeToDOM(mergedTheme);
    } catch (err) {
      console.error("Failed to update theme:", err);
      throw err;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

function applyThemeToDOM(theme: ThemeColors) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  if (theme.primary_color) {
    root.style.setProperty("--color-primary", theme.primary_color);
  }
  if (theme.secondary_color) {
    root.style.setProperty("--color-secondary", theme.secondary_color);
  }
  if (theme.accent_color) {
    root.style.setProperty("--color-accent", theme.accent_color);
  }
  if (theme.background_color) {
    root.style.setProperty("--color-bg", theme.background_color);
  }
  if (theme.text_color) {
    root.style.setProperty("--color-text", theme.text_color);
  }
}
