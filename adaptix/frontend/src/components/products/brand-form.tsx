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
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  website: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BrandFormProps {
  initialData: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BrandForm: React.FC<BrandFormProps> = ({
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
      description: "",
      website: "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
        website: initialData.website || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        website: "",
      });
    }
  }, [initialData, isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      const url = initialData
        ? `/product/brands/${initialData.id}/`
        : "/product/brands/";

      const method = initialData ? api.put : api.post;
      await method(url, values);

      handleApiSuccess(initialData ? "Brand updated" : "Brand created");
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
          <DialogTitle>
            {initialData ? "Edit Brand" : "Create Brand"}
          </DialogTitle>
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
                      placeholder="Brand Name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="https://..."
                      {...field}
                    />
                  </FormControl>
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
                    <Textarea disabled={loading} {...field} />
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
                {initialData ? "Save Changes" : "Create Brand"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
