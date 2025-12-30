"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { handleApiError, handleApiSuccess } from "@/lib/api-handler";

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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DynamicAttributeRenderer } from "../shared/DynamicAttributeRenderer";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  product_type: z.string().default("standard"),
  category: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
  barcode: z.string().optional(),
  is_active: z.boolean().default(true),
  // Variant Defaults
  price: z.coerce.number().min(0).default(0),
  cost: z.coerce.number().min(0).default(0),
  sku: z.string().optional(),
  quantity: z.coerce.number().min(0).default(0),
  attribute_set: z.string().optional(),
  attributes: z.record(z.string(), z.any()).default({}),
  // Policy & Controls
  is_tax_exempt: z.boolean().default(false),
  is_emi_eligible: z.boolean().default(true),
  is_returnable: z.boolean().default(true),
  return_window_days: z.coerce.number().min(0).default(30),
  emi_plan_ids: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  initialData: any | null;
  categories: any[];
  brands: any[];
  units: any[];
  attributeSets: any[];
  isOpen: boolean;
  onClose: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  categories,
  brands,
  units,
  attributeSets,
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [emiPlans, setEmiPlans] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchEmiPlans = async () => {
      try {
        const res = await api.get("payment/emi-plans/");
        setEmiPlans(res.data.results || res.data);
      } catch (error) {
        console.error("Failed to fetch EMI plans", error);
      }
    };
    fetchEmiPlans();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      product_type: "standard",
      category: "",
      brand: "",
      unit: "",
      description: "",
      barcode: "",
      is_active: true,
      price: 0,
      cost: 0,
      sku: "",
      quantity: 0,
      attribute_set: "",
      attributes: {},
      is_tax_exempt: false,
      is_emi_eligible: true,
      is_returnable: true,
      return_window_days: 30,
      emi_plan_ids: [],
    },
  });

  React.useEffect(() => {
    if (initialData) {
      // Check for first variant data to populate pricing
      const firstVariant =
        initialData.variants && initialData.variants.length > 0
          ? initialData.variants[0]
          : {};

      form.reset({
        name: initialData.name,
        product_type: initialData.product_type || "standard",
        category: initialData.category || "", // Handles ID string from serialized
        brand: initialData.brand || "",
        unit: initialData.unit || "",
        description: initialData.description || "",
        barcode: initialData.barcode || "",
        is_active: initialData.is_active ?? true,
        price: firstVariant.price ? Number(firstVariant.price) : 0,
        cost: firstVariant.cost ? Number(firstVariant.cost) : 0,
        sku: firstVariant.sku || "",
        quantity: firstVariant.quantity ? Number(firstVariant.quantity) : 0,
        attribute_set: initialData.attribute_set || "",
        attributes: initialData.attributes || {},
        is_tax_exempt: initialData.is_tax_exempt ?? false,
        is_emi_eligible: initialData.is_emi_eligible ?? true,
        is_returnable: initialData.is_returnable ?? true,
        return_window_days: initialData.return_window_days ?? 30,
        emi_plan_ids: initialData.emi_plan_ids || [],
      });
    } else {
      form.reset({
        name: "",
        product_type: "standard",
        category: "",
        brand: "",
        unit: "",
        description: "",
        barcode: "",
        is_active: true,
        price: 0,
        cost: 0,
        sku: "",
        quantity: 0,
        attribute_set: "",
        attributes: {},
        is_tax_exempt: false,
        is_emi_eligible: true,
        is_returnable: true,
        return_window_days: 30,
        emi_plan_ids: [],
      });
    }
  }, [initialData, isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      const url = initialData
        ? `/product/products/${initialData.id}/`
        : "/product/products/";

      const method = initialData ? api.put : api.post;
      // Convert empty strings to null for optional FKs if backend requires it
      const payload = {
        ...values,
        category: values.category || null,
        brand: values.brand || null,
        unit: values.unit || null,
        attribute_set: values.attribute_set || null,
      };

      await method(url, payload);

      handleApiSuccess(initialData ? "Product updated" : "Product created");
      router.refresh();
      onClose();
    } catch (error: any) {
      handleApiError(error, form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Product" : "Create Product"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Product Name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (Auto-generated if empty)</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="SKU-123"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="product_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      disabled={loading}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="consumable">Consumable</SelectItem>
                        <SelectItem value="combo">Combo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select
                      disabled={loading}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name} ({u.short_name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      disabled={loading}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
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
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <Select
                      disabled={loading}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Brand" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Stock</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={loading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Scan Barcode"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  POS & Tax Controls
                </h4>
                <FormField
                  control={form.control}
                  name="is_tax_exempt"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-white dark:bg-slate-950">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Tax Exempt</FormLabel>
                        <FormDescription className="text-[10px]">
                          Disable VAT calculation for this product.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_emi_eligible"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-3 rounded-md border p-3 bg-white dark:bg-slate-950">
                      <div className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>EMI Eligible</FormLabel>
                          <FormDescription className="text-[10px]">
                            Allow installments for this product.
                          </FormDescription>
                        </div>
                      </div>

                      {field.value && emiPlans.length > 0 && (
                        <div className="space-y-2 pt-3 border-t">
                          <Label className="text-[10px] font-bold uppercase text-slate-500">
                            Supported Plans
                          </Label>
                          <div className="grid grid-cols-1 gap-2">
                            {emiPlans.map((plan) => (
                              <FormField
                                key={plan.id}
                                control={form.control}
                                name="emi_plan_ids"
                                render={({ field: planField }) => (
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={planField.value?.includes(
                                          plan.id
                                        )}
                                        onCheckedChange={(checked) => {
                                          const current = planField.value || [];
                                          if (checked) {
                                            planField.onChange([
                                              ...current,
                                              plan.id,
                                            ]);
                                          } else {
                                            planField.onChange(
                                              current.filter(
                                                (id: string) => id !== plan.id
                                              )
                                            );
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-[10px] font-normal cursor-pointer">
                                      {plan.name} ({plan.tenure_months}m)
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormDescription className="text-[10px]">
                            Select specific plans. If none selected, all active
                            plans are allowed.
                          </FormDescription>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Return Policy
                </h4>
                <FormField
                  control={form.control}
                  name="is_returnable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-white dark:bg-slate-950">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Can be Returned</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                {form.watch("is_returnable") && (
                  <FormField
                    control={form.control}
                    name="return_window_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Return Window (Days)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            disabled={loading}
                            className="h-8"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea disabled={loading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attribute_set"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attribute Set (Custom Fields)</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Set" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {attributeSets.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("attribute_set") &&
              form.watch("attribute_set") !== "none" && (
                <DynamicAttributeRenderer
                  form={form}
                  attributeSet={attributeSets.find(
                    (s) => String(s.id) === form.watch("attribute_set")
                  )}
                />
              )}

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
                {initialData ? "Save Changes" : "Create Product"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
