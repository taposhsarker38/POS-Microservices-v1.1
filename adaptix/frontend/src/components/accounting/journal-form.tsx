"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { handleApiError, handleApiSuccess } from "@/lib/api-handler";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Schema
const journalSchema = z.object({
  date: z.string(),
  reference: z.string().optional(),
  wing_uuid: z.string().min(1, "Branch is required"),
  voucher_type: z.enum(["receipt", "payment", "contra", "journal"]),
  description: z.string().optional(),
  items: z
    .array(
      z.object({
        account: z.string().min(1, "Account required"),
        debit: z.coerce.number().min(0).default(0),
        credit: z.coerce.number().min(0).default(0),
        description: z.string().optional(),
      })
    )
    .refine(
      (items) => {
        const totalDebit = items.reduce(
          (sum, item) => sum + (item.debit || 0),
          0
        );
        const totalCredit = items.reduce(
          (sum, item) => sum + (item.credit || 0),
          0
        ); // fixed
        return Math.abs(totalDebit - totalCredit) < 0.01;
      },
      { message: "Debits must equal Credits" }
    ),
});

type JournalFormValues = z.infer<typeof journalSchema>;

export function JournalEntryForm({
  onSuccess,
  initialCompanyId,
  initialWingId,
  entities = [],
  initialData,
}: {
  onSuccess?: () => void;
  initialCompanyId?: string;
  initialWingId?: string;
  entities?: any[];
  initialData?: any;
}) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [wings, setWings] = useState<any[]>([]);

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema) as any,
    defaultValues: {
      date: initialData?.date || new Date().toISOString().split("T")[0],
      reference: initialData?.reference || "",
      wing_uuid:
        initialWingId ||
        (initialData?.wing_uuid
          ? initialData.wing_uuid
          : initialCompanyId || ""),
      voucher_type: initialData?.voucher_type || "journal",
      description: initialData?.description || "",
      items: initialData?.items || [
        { account: "", debit: 0, credit: 0, description: "" },
        { account: "", debit: 0, credit: 0, description: "" },
      ],
    },
  });

  useEffect(() => {
    if (initialData) {
      const resetItems =
        initialData.items?.length > 0
          ? initialData.items.map((it: any) => ({
              account: it.account,
              debit: parseFloat(it.debit) || 0,
              credit: parseFloat(it.credit) || 0,
              description: it.description || "",
            }))
          : [
              { account: "", debit: 0, credit: 0, description: "" },
              { account: "", debit: 0, credit: 0, description: "" },
            ];

      form.reset({
        date: initialData.date,
        reference: initialData.reference || "",
        wing_uuid: initialData.wing_uuid || initialData.company_uuid || "",
        voucher_type: initialData.voucher_type,
        description: initialData.description || "",
        items: resetItems,
      });
    }
  }, [initialData, form]);

  useEffect(() => {
    // Only set default wing if we are NOT in edit mode
    if (initialWingId && !initialData) {
      form.setValue("wing_uuid", initialWingId);
    }
  }, [initialWingId, initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedWing = form.watch("wing_uuid");
  const contextCompanyId = initialData?.company_uuid || initialCompanyId;

  // Effect to populate Wings (Branches)
  useEffect(() => {
    if (entities.length > 0) {
      // Step 1: Broadly filter to the relevant company context
      let filteredWings = entities.filter(
        (w) =>
          String(w.id) === String(contextCompanyId) ||
          String(w.company_id) === String(contextCompanyId) ||
          String(w.tenant_id) === String(contextCompanyId) ||
          String(w.id) === String(initialData?.company_uuid) ||
          String(w.company_id) === String(initialData?.company_uuid) ||
          String(w.tenant_id) === String(initialData?.company_uuid)
      );

      // Step 2: If we didn't find any branches/units for this company,
      // fallback to showing all entities so the user isn't blocked.
      if (filteredWings.length === 0) {
        filteredWings = entities.filter(
          (e) => e.type === "branch" || e.type === "unit" || e.type === "group"
        );
      }

      // Step 3: Ensure the specific branch/unit assigned to the journal is in the list
      const targetWingId = initialData?.wing_uuid || "MAIN_UNIT";
      const hasSelection = filteredWings.find((w) =>
        w.type === "unit"
          ? targetWingId === contextCompanyId
          : String(w.id) === String(targetWingId)
      );

      if (!hasSelection && !initialData) {
        // If creating new and no selection match (shouldn't happen often if defaults work), do nothing or default.
      } else if (!hasSelection && initialData) {
        // Only add "Unknown" if we are editing and really can't find it.
        const contextName =
          entities.find((e) => String(e.id) === String(contextCompanyId))
            ?.name || "Main Unit";

        // Check if we already added it to avoid duplicates if effect runs multiple times
        const exists = filteredWings.find(
          (w) =>
            (targetWingId === "MAIN_UNIT" && w.id === "MAIN_UNIT") ||
            String(w.id) === String(targetWingId)
        );

        if (!exists) {
          filteredWings.unshift({
            id: targetWingId === "MAIN_UNIT" ? "MAIN_UNIT" : targetWingId,
            name: targetWingId === "MAIN_UNIT" ? contextName : "Unknown Branch",
            type: targetWingId === "MAIN_UNIT" ? "unit" : "branch",
          });
        }
      }

      setWings(filteredWings);
    } else {
      // Fallback if no entities passed
      api.get("/company/wings/").then((res) => {
        setWings(res.data.results || res.data);
      });
    }
  }, [contextCompanyId, initialData, entities]);

  // Effect to Fetch Accounts (Reactive to selectedWing)
  useEffect(() => {
    // Find the full wing object to get the correct company_id
    const selectedWingObj = wings.find(
      (w) =>
        String(w.id) === String(selectedWing) ||
        (w.tenant_id && String(w.tenant_id) === String(selectedWing))
    );

    // Determine the effective company ID:
    // 1. If we selected a branch/unit, use its associated company ID (or its own ID if it's a unit)
    // 2. Fallback to the context ID passed from props
    let effectiveCompanyId = contextCompanyId;

    if (selectedWingObj) {
      if (selectedWingObj.type === "unit" || selectedWingObj.type === "group") {
        effectiveCompanyId = selectedWingObj.id;
      } else if (selectedWingObj.company_id) {
        effectiveCompanyId = selectedWingObj.company_id;
      }
    }

    if (!effectiveCompanyId) {
      return;
    }

    const fetchAccounts = async () => {
      const params = new URLSearchParams();
      params.append("company_uuid", effectiveCompanyId);

      // Pass the selected wing only if it's a branch to filter balances
      // If it's a unit/group, we want all accounts for that company context
      if (selectedWingObj && selectedWingObj.type === "branch") {
        params.append("wing_uuid", String(selectedWingObj.id));
      }

      try {
        const res = await api.get(`/accounting/accounts/?${params.toString()}`);
        setAccounts(res.data.results || res.data);
      } catch (error) {
        console.error("Failed to fetch accounts", error);
      }
    };

    fetchAccounts();
  }, [contextCompanyId, selectedWing, wings]);

  const onSubmit = async (values: JournalFormValues) => {
    // 1. Determine correct company_uuid and wing_uuid based on selection
    const selectedWingObj = wings.find(
      (w) =>
        String(w.id) === String(values.wing_uuid) ||
        (w.tenant_id && String(w.tenant_id) === String(values.wing_uuid))
    );

    let submissionCompanyId = initialCompanyId || contextCompanyId;
    let submissionWingId: string | null = values.wing_uuid;

    if (selectedWingObj) {
      if (selectedWingObj.type === "unit" || selectedWingObj.type === "group") {
        // It's a company or a group
        submissionCompanyId = selectedWingObj.id;
        submissionWingId = null; // Clear wing_uuid for company/group level entries
      } else {
        // It's a branch
        submissionCompanyId =
          selectedWingObj.company_id ||
          selectedWingObj.company ||
          submissionCompanyId;
        submissionWingId = selectedWingObj.id;
      }
    }

    const submissionValues = {
      ...values,
      wing_uuid: submissionWingId,
      company_uuid: submissionCompanyId,
    };

    try {
      if (initialData?.id) {
        await api.put(
          `/accounting/journals/${initialData.id}/`,
          submissionValues
        );
        handleApiSuccess("Transaction Updated");
      } else {
        await api.post("/accounting/journals/", submissionValues);
        handleApiSuccess("Transaction Posted");
      }
      form.reset({
        date: new Date().toISOString().split("T")[0],
        reference: "",
        wing_uuid:
          initialData?.wing_uuid || initialWingId || initialCompanyId || "",
        voucher_type: "journal",
        description: "",
        items: [
          { account: "", debit: 0, credit: 0, description: "" },
          { account: "", debit: 0, credit: 0, description: "" },
        ],
      });
      onSuccess?.();
    } catch (e: any) {
      handleApiError(e, form);
    }
  };

  const totalDebit = form
    .watch("items")
    .reduce((sum, i) => sum + (Number(i.debit) || 0), 0);
  const totalCredit = form
    .watch("items")
    .reduce((sum, i) => sum + (Number(i.credit) || 0), 0);
  const unbalanced = Math.abs(totalDebit - totalCredit).toFixed(2);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference</FormLabel>
                <FormControl>
                  <Input placeholder="INV-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="wing_uuid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch / Unit</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ? String(field.value) : "MAIN_UNIT"}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder="Select Branch / Unit"
                        className="truncate"
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-w-[400px]">
                    {wings.map((wing) => (
                      <SelectItem
                        key={wing.id}
                        value={String(wing.id)}
                        className="truncate"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>
                            {wing.type === "unit"
                              ? "🏢"
                              : wing.type === "group"
                              ? "🏦"
                              : "📍"}
                          </span>
                          <span className="truncate">{wing.name}</span>
                          <span className="text-[10px] opacity-50 shrink-0">
                            (
                            {wing.type === "unit"
                              ? "Unit"
                              : wing.type === "group"
                              ? "Group"
                              : "Branch"}
                            )
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="voucher_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voucher Type (ভাউচার টাইপ)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="receipt">Receipt (RV)</SelectItem>
                    <SelectItem value="payment">Payment (PV)</SelectItem>
                    <SelectItem value="contra">Contra (CV)</SelectItem>
                    <SelectItem value="journal">Journal (JV)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Transaction summary..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border rounded-md p-4 bg-muted/20 overflow-x-auto">
          <div className="min-w-[500px]">
            <div className="mb-2 grid grid-cols-12 gap-2 text-sm font-medium">
              <div className="col-span-6">Account</div>
              <div className="col-span-2">Debit</div>
              <div className="col-span-2">Credit</div>
              <div className="col-span-2"></div>
            </div>
            {fields.map((fieldItem, index) => (
              <div
                key={fieldItem.id}
                className="grid grid-cols-12 gap-2 mb-2 items-start"
              >
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name={`items.${index}.account`}
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ? String(field.value) : undefined}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full truncate">
                              <SelectValue placeholder="Account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-w-[300px] max-h-[300px]">
                            {accounts.length === 0 && (
                              <div className="p-2 text-xs text-muted-foreground text-center">
                                No accounts found
                              </div>
                            )}
                            {accounts.map((acc) => (
                              <SelectItem
                                key={acc.id}
                                value={String(acc.id)}
                                className="truncate"
                              >
                                <span className="font-mono text-[10px] mr-2 opacity-70">
                                  [{acc.code}]
                                </span>
                                {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.debit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="min-w-[60px]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.credit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="min-w-[60px]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2 flex items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ account: "", debit: 0, credit: 0, description: "" })
              }
            >
              <Plus className="mr-2 h-3 w-3" /> Add Line
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center p-4 border rounded-md">
          <div>
            {form.formState.errors.items?.root && (
              <p className="text-red-500 text-sm">
                {form.formState.errors.items.root.message}
              </p>
            )}
            {Number(unbalanced) > 0 && (
              <p className="text-red-500 text-sm">Unbalanced: {unbalanced}</p>
            )}
          </div>
          <div className="text-right space-y-1">
            <div className="flex justify-end gap-4 text-sm">
              <span>
                Total Debit: <strong>{totalDebit.toFixed(2)}</strong>
              </span>
              <span>
                Total Credit: <strong>{totalCredit.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={Number(unbalanced) > 0.01 || form.formState.isSubmitting}
        >
          {initialData?.id ? "Update Transaction" : "Post Transaction"}
        </Button>
      </form>
    </Form>
  );
}
