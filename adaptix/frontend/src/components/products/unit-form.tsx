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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"), // e.g., Kilogram
  short_name: z.string().min(1, "Short name is required"), // e.g. kg
  // allow_decimal: z.boolean().default(true), // if supported by backend
});

type FormValues = z.infer<typeof formSchema>;

interface UnitFormProps {
  initialData: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UnitForm: React.FC<UnitFormProps> = ({
  initialData,
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      short_name: "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        short_name: initialData.short_name,
      });
    } else {
      form.reset({
        name: "",
        short_name: "",
      });
    }
  }, [initialData, isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      const url = initialData
        ? `/product/units/${initialData.id}/`
        : "/product/units/";

      const method = initialData ? api.put : api.post;
      await method(url, values);

      handleApiSuccess(initialData ? "Unit updated" : "Unit created");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Unit" : "Create Unit"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="e.g. Kilogram"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="short_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Name (Symbol)</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="e.g. kg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                {initialData ? "Save Changes" : "Create Unit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
