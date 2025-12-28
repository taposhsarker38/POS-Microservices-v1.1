"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Palette, Globe, Mail, Layout, Save, Eye, EyeOff } from "lucide-react";

export const WhiteLabelSettings: React.FC = () => {
  const { theme, updateTheme } = useTheme();
  const [radius, setRadius] = useState<number>(
    parseFloat(theme.theme_config?.radius || "0.5")
  );
  const [font, setFont] = useState(theme.theme_config?.font_main || "Inter");
  const [domain, setDomain] = useState("");

  // SMTP State
  const [smtp, setSmtp] = useState({
    host: "",
    port: "587",
    user: "",
    pass: "", // password
    default_from_email: "",
    use_tls: true,
    use_ssl: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch Settings on Mount
  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await import("@/lib/api").then((m) =>
          m.default.get("/notification/smtp-settings/")
        );
        // API returns list, get first or empty
        const config = data.results?.[0] || data[0] || {};
        if (config.host) {
          setSmtp({
            host: config.host,
            port: config.port?.toString() || "587",
            user: config.username || "",
            pass: "",
            default_from_email: config.default_from_email || "",
            use_tls: config.use_tls !== undefined ? config.use_tls : true,
            use_ssl: config.use_ssl !== undefined ? config.use_ssl : false,
          });
        }
      } catch (err) {
        console.error("Failed to load SMTP settings", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveTheme = async () => {
    // ... theme logic unchanged ...
    try {
      await updateTheme({
        theme_config: {
          ...theme.theme_config,
          radius: `${radius}rem`,
          font_main: font,
        },
      });
      toast.success("Theme settings saved!");
    } catch (error) {
      toast.error("Failed to save theme settings");
    }
  };

  const handleSaveSmtp = async () => {
    setLoading(true);
    try {
      const payload = {
        host: smtp.host,
        port: parseInt(smtp.port),
        username: smtp.user,
        password: smtp.pass,
        default_from_email: smtp.default_from_email,
        use_tls: smtp.use_tls,
        use_ssl: smtp.use_ssl,
      };
      if (!payload.password) delete (payload as any).password;

      await import("@/lib/api").then((m) =>
        m.default.post("/notification/smtp-settings/", payload)
      );
      toast.success("SMTP Configuration saved successfully!");
    } catch (error: any) {
      console.error(error);
      const msg =
        error.response?.data?.detail || error.message || "Unknown error";
      toast.error(`Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theming Card (Unchanged) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" /> Appearance
            </CardTitle>
            <CardDescription>
              Customize your brand's look and feel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Border Radius ({radius}rem)</Label>
              <Slider
                value={[radius]}
                max={2}
                step={0.1}
                onValueChange={(v) => setRadius(v[0])}
              />
            </div>
            <div className="space-y-2">
              <Label>Main Font</Label>
              <Input
                value={font}
                onChange={(e) => setFont(e.target.value)}
                placeholder="e.g. Inter, Roboto, Poppins"
              />
            </div>
            <Button onClick={handleSaveTheme} className="w-full">
              <Save className="w-4 h-4 mr-2" /> Apply Styles
            </Button>
          </CardContent>
        </Card>

        {/* Custom Domain Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" /> Custom Domain
            </CardTitle>
            <CardDescription>
              Connect your own domain to the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Domain Name</Label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="portal.acmecorp.com"
              />
            </div>
            <Button variant="outline" className="w-full" disabled>
              Verify Domain (Coming Soon)
            </Button>
          </CardContent>
        </Card>

        {/* SMTP Card */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" /> SMTP Configuration
            </CardTitle>
            <CardDescription>Send emails from your own server.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input
                value={smtp.host}
                onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                value={smtp.port}
                onChange={(e) => setSmtp({ ...smtp, port: e.target.value })}
                placeholder="587"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={smtp.user}
                onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                placeholder="noreply@acmecorp.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={smtp.pass}
                  onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Label>Use TLS</Label>
                <input
                  type="checkbox"
                  checked={smtp.use_tls}
                  onChange={(e) =>
                    setSmtp({ ...smtp, use_tls: e.target.checked })
                  }
                  className="w-4 h-4"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>Use SSL</Label>
                <input
                  type="checkbox"
                  checked={smtp.use_ssl}
                  onChange={(e) =>
                    setSmtp({ ...smtp, use_ssl: e.target.checked })
                  }
                  className="w-4 h-4"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>From Email</Label>
              <Input
                value={smtp.default_from_email}
                onChange={(e) =>
                  setSmtp({ ...smtp, default_from_email: e.target.value })
                }
                placeholder="My App <noreply@example.com>"
              />
            </div>
            <Button
              className="md:col-span-2"
              onClick={handleSaveSmtp}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />{" "}
              {loading ? "Saving..." : "Save SMTP Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
