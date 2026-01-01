"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Settings2, Save, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PURPOSES = [
  { id: "sales_revenue", name: "Sales Revenue", group: "income" },
  { id: "cash_on_hand", name: "Cash on Hand", group: "asset" },
  { id: "sales_tax_payable", name: "Sales Tax Payable", group: "liability" },
  {
    id: "depreciation_expense",
    name: "Depreciation Expense",
    group: "expense",
  },
  {
    id: "accumulated_depreciation",
    name: "Accumulated Depreciation",
    group: "asset",
  },
  { id: "inventory", name: "Inventory Assets", group: "asset" },
  { id: "cost_of_goods_sold", name: "Cost of Goods Sold", group: "expense" },
];

export function SystemAccountMapping({ companyId }: { companyId?: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [accRes, mapRes] = await Promise.all([
          api.get(`/accounting/accounts/?company_uuid=${companyId}`),
          api.get(`/accounting/system-accounts/?company_uuid=${companyId}`),
        ]);

        setAccounts(accRes.data.results || accRes.data);

        const initialMappings: Record<string, string> = {};
        (mapRes.data.results || mapRes.data).forEach((m: any) => {
          initialMappings[m.purpose] = m.account;
        });
        setMappings(initialMappings);
      } catch (err) {
        console.error("Failed to fetch system account data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId]);

  const handleSave = async (purpose: string, accountId: string) => {
    setSaving(true);
    try {
      await api.post("/accounting/system-accounts/", {
        company_uuid: companyId,
        purpose,
        account: accountId,
      });
      setMappings((prev) => ({ ...prev, [purpose]: accountId }));
      toast.success(`${purpose.replace(/_/g, " ")} mapping saved`);
    } catch (err) {
      console.error("Failed to save mapping", err);
      toast.error("Failed to save mapping");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading account configurations...</div>;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Why configure these?</AlertTitle>
        <AlertDescription>
          Mapped accounts are used automatically by the system for POS sales,
          tax splitting, and depreciation. If not configured, the system uses
          defaults.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PURPOSES.map((purpose) => (
          <Card key={purpose.id} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold capitalize flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-400" />
                {purpose.name}
              </CardTitle>
              <CardDescription className="text-xs">
                Expected Account Group:{" "}
                <span className="uppercase font-medium">{purpose.group}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Select
                  value={mappings[purpose.id] || ""}
                  onValueChange={(val) => handleSave(purpose.id, val)}
                  disabled={saving}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter(
                        (a) =>
                          a.group_type?.toLowerCase() === purpose.group ||
                          !a.group_type
                      ) // Soft filter
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
