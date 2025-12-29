"use client";

import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { DynamicAttributeRenderer } from "../shared/DynamicAttributeRenderer";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  loyalty_points: z.coerce.number().min(0).default(0),
  branch_id: z.string().optional().nullable(),
  attribute_set: z.string().optional(),
  attributes: z.record(z.string(), z.any()).default({}),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialData?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
  attributeSets: any[];
  branches: any[];
  isAdmin?: boolean;
  userBranchUuid?: string | null;
}

export function CustomerForm({
  initialData,
  onSuccess,
  onCancel,
  attributeSets,
  branches,
  userBranchUuid,
}: CustomerFormProps) {
  // Resolve userBranchUuid (which is likely a UUID) to the internal branch ID (integer) used in options
  const userBranchId = userBranchUuid
    ? String(
        branches.find(
          (b) =>
            b.uuid === userBranchUuid || String(b.id) === String(userBranchUuid)
        )?.id || ""
      )
    : null;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      address: initialData?.address || "",
      loyalty_points: initialData?.loyalty_points
        ? Number(initialData.loyalty_points)
        : 0,
      branch_id: initialData?.branch_id
        ? String(initialData.branch_id)
        : userBranchId || null,
      attribute_set: initialData?.attribute_set
        ? String(initialData.attribute_set)
        : "",
      attributes: initialData?.attributes || {},
    },
  });

  const [verifyingField, setVerifyingField] = useState<
    "email" | "phone" | null
  >(null);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Local state to track verification status updates immediately without refetch
  const [verificationStatus, setVerificationStatus] = useState({
    email: initialData?.is_email_verified || false,
    phone: initialData?.is_phone_verified || false,
  });

  useEffect(() => {
    if (initialData) {
      setVerificationStatus({
        email: initialData.is_email_verified,
        phone: initialData.is_phone_verified,
      });
    }
  }, [initialData]);

  // Force update branch_id when userBranchId is resolved (handles async branch loading)
  useEffect(() => {
    if (userBranchId && !form.getValues("branch_id")) {
      form.setValue("branch_id", userBranchId);
    }
  }, [userBranchId, form]);

  const handleSendOtp = async (type: "email" | "phone") => {
    if (!initialData?.id) return;
    setIsSendingOtp(true);
    try {
      // Pass the current value from form to ensure we verify the CORRECT number/email
      // But backend sends to stored. Logic gap: If user changed phone in form but didn't save, backend uses old phone.
      // For now, we assume user saved or we warn.
      // Ideally: "Save changes before verifying"

      await api.post(
        `/customer/customers/${initialData.id}/send-verification/`,
        { type }
      );
      setVerifyingField(type);
      setOtpCode("");
      toast.success(`OTP sent to ${type}`);
    } catch (e) {
      toast.error("Failed to send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!initialData?.id || !verifyingField) return;
    setIsVerifyingOtp(true);
    try {
      await api.post(`/customer/customers/${initialData.id}/verify-otp/`, {
        type: verifyingField,
        otp: otpCode,
      });
      toast.success(`${verifyingField} verified successfully`);
      setVerificationStatus((prev) => ({ ...prev, [verifyingField]: true }));
      setVerifyingField(null);
    } catch (e) {
      toast.error("Invalid OTP");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Removed debug/reset useEffect as we now use key-based remounting with correct defaultValues

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      const payload = {
        ...values,
        attribute_set:
          values.attribute_set === "none" || !values.attribute_set
            ? null
            : values.attribute_set,
      };

      if (initialData) {
        await api.put(`/customer/customers/${initialData.id}/`, payload);
        toast.success("Customer updated");
      } else {
        await api.post("/customer/customers/", payload);
        toast.success("Customer created");
      }
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to save customer");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex justify-between items-center">
                  Phone
                  {initialData?.id &&
                    (verificationStatus.phone ? (
                      <Badge
                        variant="outline"
                        className="text-emerald-600 bg-emerald-50 border-emerald-200 gap-1"
                      >
                        <CheckCircle className="h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 text-xs text-blue-600 hover:text-blue-700 p-0"
                        onClick={() => handleSendOtp("phone")}
                        disabled={isSendingOtp}
                      >
                        {isSendingOtp ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Verify Now"
                        )}
                      </Button>
                    ))}
                </FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex justify-between items-center">
                  Email
                  {initialData?.id &&
                    (verificationStatus.email ? (
                      <Badge
                        variant="outline"
                        className="text-emerald-600 bg-emerald-50 border-emerald-200 gap-1"
                      >
                        <CheckCircle className="h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 text-xs text-blue-600 hover:text-blue-700 p-0"
                        onClick={() => handleSendOtp("email")}
                        disabled={isSendingOtp}
                      >
                        {isSendingOtp ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Verify Now"
                        )}
                      </Button>
                    ))}
                </FormLabel>
                <FormControl>
                  <Input placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="123 Main St..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="branch_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch / Unit</FormLabel>
              <Select
                onValueChange={(val) =>
                  field.onChange(val === "none" ? null : val)
                }
                value={field.value || "none"}
                disabled={!!userBranchUuid}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Branch (defaults to General)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">General / No Branch</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name} ({b.type})
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
          name="attribute_set"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attribute Set (Custom Fields)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? "Update Customer" : "Create Customer"}
          </Button>
        </div>
      </form>

      <Dialog
        open={!!verifyingField}
        onOpenChange={() => setVerifyingField(null)}
      >
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Verify{" "}
              {verifyingField === "email" ? "Email Address" : "Phone Number"}
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit code sent to your {verifyingField}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter 6-digit OTP"
                className="text-center text-lg tracking-widest"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
              <p className="text-xs text-center text-muted-foreground">
                Mock OTP: Check the console or backend response (It's usually
                123456 or random in logs)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyingField(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleVerifyOtp}
              disabled={isVerifyingOtp || otpCode.length < 4}
            >
              {isVerifyingOtp && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Verify Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
