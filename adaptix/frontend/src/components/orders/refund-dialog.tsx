"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { components } from "@/types/pos-api";

type Order = components["schemas"]["Order"];

const returnSchema = z.object({
  items: z
    .array(
      z.object({
        order_item: z.string().uuid(),
        quantity: z.number().min(0.001),
        condition: z.enum(["good", "damaged", "defective"]),
        selected: z.boolean(),
      })
    )
    .refine((items) => items.some((item) => item.selected), {
      message: "Select at least one item to return",
    }),
  reason: z.string().optional(),
});

interface RefundDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RefundDialog({
  order,
  open,
  onOpenChange,
  onSuccess,
}: RefundDialogProps) {
  const [loading, setLoading] = React.useState(false);

  const form = useForm<z.infer<typeof returnSchema>>({
    resolver: zodResolver(returnSchema),
    defaultValues: { items: [], reason: "" },
  });

  React.useEffect(() => {
    if (order && open) {
      form.reset({
        items: order.items.map((item) => ({
          order_item: item.id,
          quantity: Number(item.quantity),
          condition: "good",
          selected: false,
        })),
        reason: "",
      });
    }
  }, [order, open, form]);

  const onSubmit = async (values: z.infer<typeof returnSchema>) => {
    if (!order) return;
    try {
      setLoading(true);

      const itemsToReturn = values.items
        .filter((i) => i.selected)
        .map((i) => ({
          order_item: i.order_item,
          quantity: String(i.quantity),
          condition: i.condition,
        }));

      await api.post("/pos/returns/", {
        order: order.id,
        items: itemsToReturn,
        reason: values.reason,
      });

      toast.success("Return Requested Successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Failed to process return request"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Process Refund / Return</DialogTitle>
          <DialogDescription>
            Order #{order.order_number} - {order.customer_name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-[300px] border rounded-md p-4">
              <div className="space-y-4">
                {form.watch("items").map((item, index) => {
                  const originalItem = order.items.find(
                    (i) => i.id === item.order_item
                  );
                  if (!originalItem) return null;

                  return (
                    <div
                      key={item.order_item}
                      className="flex items-start space-x-4 p-2 border rounded-lg bg-slate-50 dark:bg-slate-900"
                    >
                      <FormField
                        control={form.control}
                        name={`items.${index}.selected`}
                        render={({ field }) => (
                          <FormItem className="mt-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm">
                          {originalItem.product_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Purchased: {originalItem.quantity} x $
                          {originalItem.unit_price}
                        </p>
                      </div>

                      {form.watch(`items.${index}.selected`) && (
                        <div className="flex flex-col gap-2 w-[200px]">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px]">
                                  Return Qty
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    max={Number(originalItem.quantity)}
                                    className="h-8"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.condition`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Condition" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="good">Good</SelectItem>
                                      <SelectItem value="damaged">
                                        Damaged
                                      </SelectItem>
                                      <SelectItem value="defective">
                                        Defective
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Return</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional reason..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Return
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
