"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Check,
  ArrowRight,
  Building,
  Palette,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Interface Definitions (Subset of what we need)
interface WizardData {
  companyName: string;
  primaryColor: string;
  logoUrl: string;
  loyaltyActive: boolean;
  loyaltyRate: string;
}

interface CompanySetupWizardProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CompanySetupWizard({
  open: controlledOpen,
  onOpenChange,
}: CompanySetupWizardProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const show = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) {
      onOpenChange(val);
    } else {
      setInternalOpen(val);
    }
  };

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WizardData>({
    companyName: "",
    primaryColor: "#000000",
    logoUrl: "",
    loyaltyActive: false,
    loyaltyRate: "0.01",
  });
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Check if wizard should run
  useEffect(() => {
    if (isControlled) return; // Don't auto-run if controlled

    const hasCompleted = localStorage.getItem("adaptix_setup_complete");
    if (!hasCompleted) {
      // Fetch initial data to populate
      fetchInitialData();
      setInternalOpen(true); // check
    }
  }, [isControlled]);

  // Re-fetch when opened manually
  useEffect(() => {
    if (show) {
      fetchInitialData();
      setStep(1); // Reset step on open
    }
  }, [show]);

  const fetchInitialData = async () => {
    // ... existing fetch logic ...
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/company/info/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const body = await res.json();
        setCompanyId(body.company.id);
        if (body.settings) {
          setSettingsId(body.settings.id);
          setData((prev) => ({
            ...prev,
            companyName: body.company.name,
            primaryColor: body.settings.primary_color || "#000000",
            logoUrl: body.settings.logo || "",
          }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch wizard init data", e);
    }
  };

  const handleNext = async () => {
    if (step === 3) {
      await finishSetup();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const finishSetup = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    try {
      // 1. Save Branding (Step 2)
      if (settingsId) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/company/settings/${settingsId}/`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              primary_color: data.primaryColor,
              logo: data.logoUrl,
            }),
          }
        );
      }

      // 2. Save Loyalty (Step 3) - Fetch existing first to find ID, or create
      // Logic simplified: We assume a customer program exists or we create one.
      // For wizard speed, let's try to fetch programs, find customer one, and update it.
      const progRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/customer/program/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (progRes.ok) {
        const progBody = await progRes.json();
        const results = progBody.results || progBody;
        const customerProg = results.find(
          (p: any) => p.target_audience === "customer"
        );

        if (customerProg) {
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/customer/program/${customerProg.id}/`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                is_active: data.loyaltyActive,
                earn_rate: data.loyaltyRate,
              }),
            }
          );
        } else if (data.loyaltyActive) {
          // Create if missing and user wants it
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customer/program/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: "Customer Loyalty",
              target_audience: "customer",
              is_active: true,
              earn_rate: data.loyaltyRate,
              redemption_rate: "1.0", // Default
            }),
          });
        }
      }

      localStorage.setItem("adaptix_setup_complete", "true");
      handleOpenChange(false);
    } catch (e) {
      console.error("Setup failed", e);
      // Could show toast error here
    } finally {
      setLoading(false);
    }
  };

  // Render Steps
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Building size={20} />
              </div>
              <div>
                <h3 className="font-medium">Company Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Confirm your organization details
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={data.companyName} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Contact support to change your legal entity name.
              </p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                <Palette size={20} />
              </div>
              <div>
                <h3 className="font-medium">Branding</h3>
                <p className="text-sm text-muted-foreground">
                  Make Adaptix feel like home
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Primary Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  className="w-12 p-1 h-10"
                  value={data.primaryColor}
                  onChange={(e) =>
                    setData({ ...data, primaryColor: e.target.value })
                  }
                />
                <Input
                  value={data.primaryColor}
                  onChange={(e) =>
                    setData({ ...data, primaryColor: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={data.logoUrl}
                placeholder="https://example.com/logo.png"
                onChange={(e) => setData({ ...data, logoUrl: e.target.value })}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Award size={20} />
              </div>
              <div>
                <h3 className="font-medium">Customer Loyalty</h3>
                <p className="text-sm text-muted-foreground">
                  Start rewarding your customers today
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border p-4 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Loyalty Program</Label>
                <p className="text-sm text-muted-foreground">
                  Customers earn points on every purchase
                </p>
              </div>
              <Switch
                checked={data.loyaltyActive}
                onCheckedChange={(c: boolean) =>
                  setData({ ...data, loyaltyActive: c })
                }
              />
            </div>
            {data.loyaltyActive && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Earn Rate</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={data.loyaltyRate}
                    onChange={(e) =>
                      setData({ ...data, loyaltyRate: e.target.value })
                    }
                  />
                  <span className="text-sm text-muted-foreground self-center">
                    Points per $1
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={!!show} onOpenChange={handleOpenChange}>
      {/* Remove Close button to force Setup? OR allow close. Letting allow close for UX. */}
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Welcome Setup</DialogTitle>
          <DialogDescription>Step {step} of 3</DialogDescription>
        </DialogHeader>

        {renderStep()}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1 || loading}
          >
            Back
          </Button>
          <Button onClick={handleNext} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === 3 ? "Complete Setup" : "Next"}
            {step !== 3 && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
