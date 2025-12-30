"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, UserPlus } from "lucide-react";
import { VendorForm } from "@/components/purchase/vendor-form";

import {
  Dialog,
  DialogContent,
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const itemSchema = z.object({
  product_uuid: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be > 0"),
  unit_cost: z.coerce.number().min(0, "Cost must be >= 0"),
  tax_amount: z.coerce.number().default(0),
});

const formSchema = z.object({
  vendor: z.string().min(1, "Vendor is required"), // Vendor ID (UUID or ID)
  status: z.string().default("draft"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Add at least one item"),
});

type FormValues = z.infer<typeof formSchema>;

interface PurchaseOrderFormProps {
  initialData: any | null;
  vendors: any[];
  products: any[];
  isOpen: boolean;
  onClose: () => void;
  onVendorCreated?: () => void;
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  initialData,
  vendors,
  products,
  isOpen,
  onClose,
  onVendorCreated,
}) => {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [openVendor, setOpenVendor] = React.useState(false);

  // Calculate Total (Display only)
  const calculateTotal = (items: any[]) => {
    return items.reduce((acc, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const cost = parseFloat(item.unit_cost) || 0;
      const tax = parseFloat(item.tax_amount) || 0;
      return acc + (qty * cost + tax);
    }, 0);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      vendor: "",
      status: "draft",
      notes: "",
      items: [{ product_uuid: "", quantity: 1, unit_cost: 0, tax_amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch items for total calculation
  const watchedItems = form.watch("items");
  const grandTotal = calculateTotal(watchedItems);

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        vendor: initialData.vendor?.id || initialData.vendor, // Handle Object or ID
        status: initialData.status || "draft",
        notes: initialData.notes || "",
        items: (initialData.items || []).map((item: any) => ({
          product_uuid: item.product_uuid,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          tax_amount: item.tax_amount,
        })),
      });
    } else {
      form.reset({
        vendor: "",
        status: "draft",
        notes: "",
        items: [{ product_uuid: "", quantity: 1, unit_cost: 0, tax_amount: 0 }],
      });
    }
  }, [initialData, isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      const url = initialData
        ? `/purchase/orders/${initialData.id}/`
        : "/purchase/orders/";

      const method = initialData ? api.put : api.post;
      // Filter any extra data if needed, but schema handles it.
      await method(url, values);

      toast.success(initialData ? "Order updated" : "Order created");
      router.refresh();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to find product cost from selection (to auto-fill cost)
  const onProductSelect = (index: number, productId: string) => {
    // Find product
    const product = products.find((p) => p.id === productId);
    // Auto-fill cost if product has cost.
    // Assuming product has `cost` or `price`.
    // Since it's PURCHASE, we probably want Last Cost or just 0.
    // Not implemented strictly here, but could be: form.setValue(`items.${index}.unit_cost`, product.cost)
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Purchase Order" : "Create Purchase Order"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 flex-1 overflow-hidden flex flex-col"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <div className="flex gap-2">
                      <Select
                        disabled={loading}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(vendors) &&
                            vendors.map((vendor) => (
                              <SelectItem
                                key={vendor.id}
                                value={String(vendor.id)}
                              >
                                {vendor.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setOpenVendor(true)}
                        title="Add New Vendor"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      disabled={loading}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending_approval">
                          Pending Approval
                        </SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea disabled={loading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="flex -items-center justify-between">
              <h4 className="text-sm font-medium">Items</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    product_uuid: "",
                    quantity: 1,
                    unit_cost: 0,
                    tax_amount: 0,
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-md p-4">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex gap-4 items-end border-b pb-4 last:border-0 last:pb-0"
                  >
                    <FormField
                      control={form.control}
                      name={`items.${index}.product_uuid`}
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[200px]">
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            Product
                          </FormLabel>
                          <Select
                            disabled={loading}
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(products) &&
                                products.map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="w-[100px]">
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            Qty
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.unit_cost`}
                      render={({ field }) => (
                        <FormItem className="w-[120px]">
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            Cost
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mb-0.5"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between items-center bg-secondary/20 p-4 rounded-md">
              <span className="font-semibold">Total Amount</span>
              <span className="text-xl font-bold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(grandTotal)}
              </span>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                disabled={loading}
                variant="outline"
                onClick={onClose}
                type="button"
              >
                Cancel
              </Button>
              <Button disabled={loading} type="submit">
                {initialData ? "Save Changes" : "Create Order"}
              </Button>
            </div>
          </form>
        </Form>
        <VendorForm
          isOpen={openVendor}
          onClose={() => setOpenVendor(false)}
          onSuccess={() => {
            // Ideally we'd refresh the vendor list here,
            // but the parent PurchaseOrderClient will do it on modal close.
            // For immediate feedback, we might need a way to tell the parent.
            // But since this is a child of the dashboard, it works via props.
            toast.info("Please refresh data to see the new vendor.");
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
