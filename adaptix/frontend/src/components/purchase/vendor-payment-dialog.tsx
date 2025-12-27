"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import api from "@/lib/api";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  method: z.string().min(1, "Payment method is required"),
  note: z.string().optional(),
});

interface VendorPaymentDialogProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VendorPaymentDialog: React.FC<VendorPaymentDialogProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      method: "bank_transfer",
      note: "",
    },
  });

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      const due =
        parseFloat(order.total_amount) - parseFloat(order.paid_amount || "0");
      form.reset({
        amount: due > 0 ? due.toFixed(2) : "0",
        method: "bank_transfer",
        note: "",
      });
    }
  }, [order, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!order) return;
    setLoading(true);
    try {
      await api.post(`/purchase/orders/${order.id}/record-payment/`, {
        amount: parseFloat(values.amount),
        method: values.method,
        note: values.note,
      });
      toast.success("Payment recorded successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  const total = parseFloat(order.total_amount);
  const paid = parseFloat(order.paid_amount || "0");
  const due = total - paid;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Vendor Payment</DialogTitle>
          <DialogDescription>
            Enter payment details for Order #{order.reference_number}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="font-medium">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(total)}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-muted-foreground">Due Amount</span>
            <span className="font-bold text-red-500">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(due)}
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>
                    Partial payments are allowed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="wallet">Digital Wallet</SelectItem>
                      <SelectItem value="card">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Transaction ID, Check Number, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
