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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Fallback to Alert
import { Loader2 } from "lucide-react";

interface LoyaltyProgram {
  id: number;
  name: string;
  earn_rate: string; // Decimal string
  redemption_rate: string;
  is_active: boolean;
  target_audience: "customer" | "employee";
}

export function LoyaltySettings() {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPrograms = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/customer/program/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.results || data);
      } else {
        setError("Failed to fetch loyalty programs.");
      }
    } catch (err) {
      setError("Error fetching data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleUpdate = async (id: number, updates: Partial<LoyaltyProgram>) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/customer/program/${id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        }
      );

      if (res.ok) {
        const updatedProgram = await res.json();
        setPrograms((prev) =>
          prev.map((p) => (p.id === id ? updatedProgram : p))
        );
      } else {
        alert("Failed to update program.");
      }
    } catch (err) {
      alert("Error updating program.");
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

  // Helper to get or create placeholder if missing
  const customerProgram =
    programs.find((p) => p.target_audience === "customer") || null;
  const employeeProgram =
    programs.find((p) => p.target_audience === "employee") || null;

  return (
    <div className="space-y-6">
      <div className="max-w-xl">
        <h3 className="text-lg font-medium">Rewards Configuration</h3>
        <p className="text-sm text-slate-500">
          Manage earn rates and status for loyalty programs.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Program Card */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Rewards</CardTitle>
            <CardDescription>
              Points earned by customers on purchase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {customerProgram ? (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="customer-active">Program Active</Label>
                  <Switch
                    id="customer-active"
                    checked={customerProgram.is_active}
                    onCheckedChange={(checked: boolean) =>
                      handleUpdate(customerProgram.id, { is_active: checked })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-rate">
                    Earn Rate (Points per unit currency)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="customer-rate"
                      type="number"
                      step="0.01"
                      defaultValue={customerProgram.earn_rate}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val !== parseFloat(customerProgram.earn_rate)) {
                          handleUpdate(customerProgram.id, {
                            earn_rate: e.target.value,
                          });
                        }
                      }}
                    />
                    <span className="text-sm text-slate-500 self-center">
                      pts/$
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 italic">
                No customer program configured.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Program Card */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Rewards</CardTitle>
            <CardDescription>Incentives for employees.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {employeeProgram ? (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="employee-active">Program Active</Label>
                  <Switch
                    id="employee-active"
                    checked={employeeProgram.is_active}
                    onCheckedChange={(checked: boolean) =>
                      handleUpdate(employeeProgram.id, { is_active: checked })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-rate">Earn Rate (Multiplier)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="employee-rate"
                      type="number"
                      step="0.01"
                      defaultValue={employeeProgram.earn_rate}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val !== parseFloat(employeeProgram.earn_rate)) {
                          handleUpdate(employeeProgram.id, {
                            earn_rate: e.target.value,
                          });
                        }
                      }}
                    />
                    <span className="text-sm text-slate-500 self-center">
                      x
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 italic">
                No employee program configured.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
