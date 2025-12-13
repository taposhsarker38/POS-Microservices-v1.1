"use client";

import { useTheme } from "@/contexts/ThemeContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2, Palette } from "lucide-react";

export default function ThemeSettingsPage() {
  const { theme, updateTheme, loading } = useTheme();
  const [colors, setColors] = useState({
    primary_color: theme.primary_color || "#8b5cf6",
    secondary_color: theme.secondary_color || "#a78bfa",
    accent_color: theme.accent_color || "#06b6d4",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateTheme(colors);
      setMessage("Theme updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Failed to update theme. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setColors({
      primary_color: "#8b5cf6",
      secondary_color: "#a78bfa",
      accent_color: "#06b6d4",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Theme Customization
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your brand colors and appearance
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-violet-600" />
            <CardTitle>Brand Colors</CardTitle>
          </div>
          <CardDescription>
            Choose colors that match your brand identity. Changes will apply
            immediately across the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Color */}
          <div className="space-y-2">
            <Label htmlFor="primary">Primary Color</Label>
            <div className="flex items-center gap-4">
              <Input
                id="primary"
                type="color"
                value={colors.primary_color}
                onChange={(e) =>
                  setColors({ ...colors, primary_color: e.target.value })
                }
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={colors.primary_color}
                onChange={(e) =>
                  setColors({ ...colors, primary_color: e.target.value })
                }
                className="flex-1 font-mono text-sm"
                placeholder="#8b5cf6"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used for buttons, active states, and primary actions
            </p>
          </div>

          {/* Secondary Color */}
          <div className="space-y-2">
            <Label htmlFor="secondary">Secondary Color</Label>
            <div className="flex items-center gap-4">
              <Input
                id="secondary"
                type="color"
                value={colors.secondary_color}
                onChange={(e) =>
                  setColors({ ...colors, secondary_color: e.target.value })
                }
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={colors.secondary_color}
                onChange={(e) =>
                  setColors({ ...colors, secondary_color: e.target.value })
                }
                className="flex-1 font-mono text-sm"
                placeholder="#a78bfa"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used for secondary elements and accents
            </p>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <Label htmlFor="accent">Accent Color</Label>
            <div className="flex items-center gap-4">
              <Input
                id="accent"
                type="color"
                value={colors.accent_color}
                onChange={(e) =>
                  setColors({ ...colors, accent_color: e.target.value })
                }
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={colors.accent_color}
                onChange={(e) =>
                  setColors({ ...colors, accent_color: e.target.value })
                }
                className="flex-1 font-mono text-sm"
                placeholder="#06b6d4"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used for links, highlights, and info elements
            </p>
          </div>

          {/* Preview */}
          <div className="pt-4 border-t">
            <Label className="mb-3 block">Preview</Label>
            <div className="flex gap-3">
              <div
                className="h-16 w-16 rounded-lg shadow-sm border border-slate-200"
                style={{ backgroundColor: colors.primary_color }}
                title="Primary"
              />
              <div
                className="h-16 w-16 rounded-lg shadow-sm border border-slate-200"
                style={{ backgroundColor: colors.secondary_color }}
                title="Secondary"
              />
              <div
                className="h-16 w-16 rounded-lg shadow-sm border border-slate-200"
                style={{ backgroundColor: colors.accent_color }}
                title="Accent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button onClick={handleReset} variant="outline" disabled={saving}>
              Reset to Default
            </Button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`text-sm p-3 rounded-lg ${
                message.includes("success")
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Note</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            • Theme changes are saved to your company profile and will apply to
            all users
          </p>
          <p>• Only superusers can modify theme settings</p>
          <p>
            • Changes take effect immediately without requiring a page refresh
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
