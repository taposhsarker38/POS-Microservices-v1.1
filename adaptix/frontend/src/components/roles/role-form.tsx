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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  permission_ids: z.array(z.number()).min(1, "Select at least one permission"),
});

interface RoleFormProps {
  initialData: any | null;
  permissions: any[];
  isOpen: boolean;
  onClose: () => void;
}

export const RoleForm: React.FC<RoleFormProps> = ({
  initialData,
  permissions,
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      permission_ids: initialData?.permissions?.map((p: any) => p.id) || [],
    },
  });

  // Reset form when initialData changes or isOpen toggles
  React.useEffect(() => {
    form.reset({
      name: initialData?.name || "",
      permission_ids: initialData?.permissions?.map((p: any) => p.id) || [],
    });
  }, [initialData, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const url = initialData
        ? `/auth/roles/${initialData.id}/`
        : "/auth/roles/";

      const method = initialData ? api.put : api.post;

      await method(url, values);

      handleApiSuccess(initialData ? "Role updated" : "Role created");
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Role" : "Create Role"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Role name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4">
              <FormLabel>Permissions</FormLabel>
              <div className="rounded-md border p-4">
                <ScrollArea className="h-[300px]">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="permission_ids"
                      render={() => (
                        <>
                          {(Array.isArray(permissions) ? permissions : []).map(
                            (item) => (
                              <FormField
                                key={item.id}
                                control={form.control}
                                name="permission_ids"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={item.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(
                                            item.id
                                          )}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([
                                                  ...field.value,
                                                  item.id,
                                                ])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== item.id
                                                  )
                                                );
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {item.name}{" "}
                                        <span className="text-xs text-muted-foreground">
                                          ({item.codename})
                                        </span>
                                      </FormLabel>
                                    </FormItem>
                                  );
                                }}
                              />
                            )
                          )}
                        </>
                      )}
                    />
                  </div>
                </ScrollArea>
              </div>
              <FormMessage />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                disabled={loading}
                variant="outline"
                onClick={onClose}
                type="button"
              >
                Cancel
              </Button>
              <Button disabled={loading} type="submit">
                {initialData ? "Save Changes" : "Create Role"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
