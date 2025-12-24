"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CompanySetupWizard } from "@/components/onboarding/CompanySetupWizard";

interface CompanyInfo {
  id: string;
  name: string;
  code: string;
  timezone: string;
}

interface CompanySettings {
  id: number;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  logo: string;
}

export function GeneralSettings() {
  const [showWizard, setShowWizard] = useState(false);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/company/info/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company);
        setSettings(data.settings);
      } else {
        setError("Failed to fetch company info.");
      }
    } catch (err) {
      setError("Error fetching data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof CompanySettings, value: string) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/company/settings/${settings.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
            accent_color: settings.accent_color,
            background_color: settings.background_color,
            text_color: settings.text_color,
            logo: settings.logo,
          }),
        }
      );

      if (res.ok) {
        setSuccess("Branding settings saved successfully.");
      } else {
        setError("Failed to save settings.");
      }
    } catch (err) {
      setError("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CompanySetupWizard open={showWizard} onOpenChange={setShowWizard} />

      <div className="flex justify-between items-center">
        <div>{/* Header area if needed */}</div>
        <Button variant="outline" onClick={() => setShowWizard(true)}>
          Launch Setup Wizard
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-500/15 text-green-600 border-green-500/50">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Info (Read Only) */}
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>
              Basic information about your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Company Name</Label>
              <Input
                value={company?.name || ""}
                disabled
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="grid gap-2">
              <Label>Company Code</Label>
              <Input
                value={company?.code || ""}
                disabled
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Input
                value={company?.timezone || ""}
                disabled
                readOnly
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding Settings (Editable) */}
        <Card>
          <CardHeader>
            <CardTitle>Branding & Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of your automated documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="w-12 p-1 h-10"
                        value={settings.primary_color || "#000000"}
                        onChange={(e) =>
                          handleSettingChange("primary_color", e.target.value)
                        }
                      />
                      <Input
                        id="primary_color"
                        value={settings.primary_color || ""}
                        onChange={(e) =>
                          handleSettingChange("primary_color", e.target.value)
                        }
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="w-12 p-1 h-10"
                        value={settings.secondary_color || "#000000"}
                        onChange={(e) =>
                          handleSettingChange("secondary_color", e.target.value)
                        }
                      />
                      <Input
                        id="secondary_color"
                        value={settings.secondary_color || ""}
                        onChange={(e) =>
                          handleSettingChange("secondary_color", e.target.value)
                        }
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    value={settings.logo || ""}
                    onChange={(e) =>
                      handleSettingChange("logo", e.target.value)
                    }
                    placeholder="https://..."
                  />
                </div>

                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                No settings found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
