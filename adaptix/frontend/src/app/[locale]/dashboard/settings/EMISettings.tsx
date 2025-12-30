"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  RefreshCcw,
  Loader2,
  Clock,
  Percent,
  Banknote,
  Pencil,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";
import { AlertModal } from "@/components/modals/alert-modal";

interface EMIPlan {
  id: string;
  name: string;
  provider: string;
  tenure_months: number;
  interest_rate: string;
  min_amount: string;
  is_active: boolean;
}

export function EMISettings() {
  const [plans, setPlans] = useState<EMIPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState<EMIPlan | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    provider: "Store",
    tenure_months: "6",
    interest_rate: "0",
    min_amount: "1000",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("payment/emi-plans/");
      // Handle potential pagination or direct array
      const data = res.data.results || res.data;
      setPlans(data);
    } catch (error) {
      console.error("Failed to fetch EMI plans", error);
      toast.error("Failed to load EMI plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.tenure_months) {
      toast.error("Please fill required fields");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        tenure_months: parseInt(form.tenure_months),
        interest_rate: parseFloat(form.interest_rate),
        min_amount: parseFloat(form.min_amount),
      };

      if (editingPlan) {
        await api.put(`payment/emi-plans/${editingPlan.id}/`, payload);
        toast.success("EMI Plan updated successfully");
      } else {
        await api.post("payment/emi-plans/", payload);
        toast.success("EMI Plan created successfully");
      }

      setIsModalOpen(false);
      setEditingPlan(null);
      setForm({
        name: "",
        provider: "Store",
        tenure_months: "6",
        interest_rate: "0",
        min_amount: "1000",
      });
      fetchData();
    } catch (error: any) {
      const data = error.response?.data;
      let message = editingPlan
        ? "Failed to update plan"
        : "Failed to create plan";
      if (data) {
        if (typeof data === "string") message = data;
        else if (data.detail) message = data.detail;
        else message = Object.values(data).flat().join(" ");
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (plan: EMIPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      provider: plan.provider,
      tenure_months: plan.tenure_months.toString(),
      interest_rate: plan.interest_rate,
      min_amount: plan.min_amount,
    });
    setIsModalOpen(true);
  };

  const onDeleteConfirm = async () => {
    if (!deletingId) return;
    setSubmitting(true);
    try {
      await api.delete(`payment/emi-plans/${deletingId}/`);
      toast.success("Plan deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete plan");
    } finally {
      setSubmitting(false);
      setIsAlertOpen(false);
      setDeletingId(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setIsAlertOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading EMI configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">EMI Plans</h2>
          <p className="text-muted-foreground text-sm">
            Configure installment options, durations and interest rates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCcw className="h-4 w-4" />
          </Button>

          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) {
                setEditingPlan(null);
                setForm({
                  name: "",
                  provider: "Store",
                  tenure_months: "6",
                  interest_rate: "0",
                  min_amount: "1000",
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" /> Add Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingPlan ? "Edit EMI Plan" : "Add New EMI Plan"}
                </DialogTitle>
                <DialogDescription>
                  {editingPlan
                    ? "Update the parameters for this installment plan."
                    : "Define the parameters for this installment plan."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. 6 Months Standard"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Input
                      id="provider"
                      value={form.provider}
                      onChange={(e) =>
                        setForm({ ...form, provider: e.target.value })
                      }
                      placeholder="e.g. Store, Bank"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tenure">Tenure (Months)</Label>
                    <Select
                      value={form.tenure_months}
                      onValueChange={(v) =>
                        setForm({ ...form, tenure_months: v })
                      }
                    >
                      <SelectTrigger id="tenure">
                        <SelectValue placeholder="Select Months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                        <SelectItem value="9">9 Months</SelectItem>
                        <SelectItem value="12">12 Months</SelectItem>
                        <SelectItem value="18">18 Months</SelectItem>
                        <SelectItem value="24">24 Months</SelectItem>
                        <SelectItem value="36">36 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="rate">Interest Rate (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        id="rate"
                        type="number"
                        className="pl-8"
                        value={form.interest_rate}
                        onChange={(e) =>
                          setForm({ ...form, interest_rate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="min">Min. Amount ($)</Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        id="min"
                        type="number"
                        className="pl-8"
                        value={form.min_amount}
                        onChange={(e) =>
                          setForm({ ...form, min_amount: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingPlan ? "Update EMI Plan" : "Save EMI Plan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="pl-6">Plan Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Tenure</TableHead>
                <TableHead>Rate (%)</TableHead>
                <TableHead>Min. Order</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow
                  key={plan.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="pl-6 font-medium">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      {plan.name}
                    </div>
                  </TableCell>
                  <TableCell>{plan.provider}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {plan.tenure_months}m
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-emerald-600 border-emerald-200 bg-emerald-50"
                    >
                      {plan.interest_rate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    ${parseFloat(plan.min_amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => handleEdit(plan)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteClick(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {plans.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground italic"
                  >
                    No EMI plans found. Add one to offer installment payments.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onConfirm={onDeleteConfirm}
        loading={submitting}
      />
    </div>
  );
}
