"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  X,
  Check,
  ChevronRight,
  Globe,
  MapPin,
  Building,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";

interface OrganizationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string;
  parentName?: string;
  type: "GROUP" | "HOLDING" | "UNIT" | "BRANCH";
  initialData?: any;
  onSuccess: () => void;
}

export function OrganizationWizard({
  open,
  onOpenChange,
  parentId,
  parentName,
  type,
  initialData,
  onSuccess,
}: OrganizationWizardProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    logo: "",
    timezone: "UTC",
    is_group: type === "GROUP" || type === "HOLDING",
  });

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setFormData({
        name: initialData.name || "",
        code: initialData.code || "",
        address: initialData.address || "",
        logo: initialData.logo || "",
        timezone: initialData.timezone || "UTC",
        is_group:
          initialData.is_group ?? (type === "GROUP" || type === "HOLDING"),
      });
    } else {
      setFormData({
        name: "",
        code: "",
        address: "",
        logo: "",
        timezone: "UTC",
        is_group: type === "GROUP" || type === "HOLDING",
      });
    }
  }, [open, initialData, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem("access_token");
    const endpoint =
      type === "BRANCH" ? "/company/wings/" : "/company/companies/";

    let url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`;
    if (initialData?.id) {
      url = `${url}${initialData.id}/`;
    }

    const payload =
      type === "BRANCH"
        ? {
            name: formData.name,
            code: formData.code,
            company: parentId,
            address: formData.address,
            logo: formData.logo,
          }
        : {
            name: formData.name,
            code: formData.code,
            timezone: formData.timezone,
            address: formData.address,
            logo: formData.logo,
            parent: parentId,
            is_group: formData.is_group,
          };

    try {
      const response = initialData
        ? await api.patch(`${endpoint}${initialData.id}/`, payload)
        : await api.post(endpoint, payload);

      toast.success(
        `${type} ${initialData ? "updated" : "created"} successfully!`
      );
      onOpenChange(false);
      onSuccess();
      setFormData({
        name: "",
        code: "",
        address: "",
        logo: "",
        timezone: "UTC",
        is_group: false,
      });
    } catch (error: any) {
      console.error("Wizard API Error:", error);
      const detail =
        error.response?.data?.detail ||
        error.message ||
        `Failed to ${initialData ? "update" : "create"} ${type}`;
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {initialData ? (
                <Settings2 className="h-5 w-5 text-indigo-600" />
              ) : (
                <Plus className="h-5 w-5 text-indigo-600" />
              )}
              {initialData ? "Edit" : "Add New"}{" "}
              {type.charAt(0) + type.slice(1).toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              {initialData ? (
                <>
                  Editing details for <strong>{initialData.name}</strong>
                </>
              ) : parentId ? (
                <>
                  Adding under <strong>{parentName}</strong>
                </>
              ) : (
                "Create a new root level organization."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={`e.g. ${
                    type === "BRANCH" ? "Dhaka Branch" : "Bina Industries"
                  }`}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="e.g. BIND-01"
                    className="pl-10 uppercase"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Enter full address..."
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={formData.logo}
                onChange={(e) =>
                  setFormData({ ...formData, logo: e.target.value })
                }
                placeholder="https://example.com/logo.png"
              />
            </div>

            {type !== "BRANCH" && (
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) =>
                      setFormData({ ...formData, timezone: e.target.value })
                    }
                    placeholder="UTC"
                    className="pl-10"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? (
                <Loader size="sm" variant="white" />
              ) : initialData ? (
                "Update Entity"
              ) : (
                "Create Entity"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
