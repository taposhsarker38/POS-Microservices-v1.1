"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  role_ids: z.array(z.number()),
  direct_permission_ids: z.array(z.number()),
  branch_uuid: z.string().nullable().optional(),
  is_active: z.boolean(),
  email_verified: z.boolean().optional(),
  is_terminal: z.boolean(),
  password: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UserFormProps {
  initialData: any | null;
  roles: any[];
  permissions: any[];
  branches: any[];
  isOpen: boolean;
  onClose: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({
  initialData,
  roles,
  permissions,
  branches,
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [permSearch, setPermSearch] = React.useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      role_ids: [],
      direct_permission_ids: [],
      branch_uuid: null,
      is_active: true,
      email_verified: false,
      is_terminal: false,
      password: "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        username: initialData.username,
        email: initialData.email,
        first_name: initialData.first_name,
        last_name: initialData.last_name,
        role_ids: (initialData.roles || []).map((r: any) => r.id),
        direct_permission_ids: (
          initialData.direct_permissions ||
          initialData.permissions ||
          []
        ).map((p: any) => p.id),
        branch_uuid: initialData.branch_uuid || null,
        is_active: initialData.is_active ?? true,
        email_verified: initialData.email_verified ?? false,
        is_terminal: initialData.is_terminal ?? false,
        password: "",
      });
    } else {
      form.reset({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        role_ids: [],
        direct_permission_ids: [],
        branch_uuid: null,
        is_active: true,
        email_verified: false,
        is_terminal: false,
        password: "",
      });
    }
  }, [initialData, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const url = initialData
        ? `/auth/users/${initialData.id}/`
        : "/auth/users/"; // Typically Create User

      const method = initialData ? api.put : api.post;

      const payload = {
        ...values,
        confirm_password: values.password,
      };

      await method(url, payload);

      toast.success(initialData ? "User updated" : "User created");
      router.refresh();
      onClose();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Something went wrong.";
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors) {
        // Flatten field errors
        const firstError = Object.values(fieldErrors).flat()[0];
        toast.error(`${msg}: ${firstError}`);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit User" : "Create User"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 flex-1 overflow-hidden flex flex-col"
          >
            <Tabs
              defaultValue="details"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="roles">Roles</TabsTrigger>
                <TabsTrigger value="permissions">
                  Direct Permissions
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="details"
                className="flex-1 overflow-hidden pt-4"
              >
                <ScrollArea className="h-full border rounded-md p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input disabled={loading} {...field} />
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
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input disabled={loading} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input disabled={loading} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input disabled={loading} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="branch_uuid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Branch / Unit</FormLabel>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(e.target.value || null)
                            }
                            disabled={loading}
                          >
                            <option value="">Head Office / Corporate</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name} ({b.code})
                              </option>
                            ))}
                          </select>
                          <FormDescription>
                            If selected, user will be restricted to this branch.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4">
                      <FormField
                        control={form.control}
                        name="email_verified"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 flex-1">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Email Verified</FormLabel>
                              <FormDescription>
                                Bypass email verification
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="is_active"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 flex-1">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Active</FormLabel>
                              <FormDescription>User can login</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="is_terminal"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 flex-1">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Terminal User</FormLabel>
                              <FormDescription>For POS access</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Password{" "}
                            {initialData && "(Leave blank to keep current)"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="******"
                              type="password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="roles"
                className="flex-1 overflow-hidden pt-4"
              >
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  <FormField
                    control={form.control}
                    name="role_ids"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Roles</FormLabel>
                          <FormDescription>
                            Select roles to assign to this user.
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {(roles || []).map((role) => (
                            <FormField
                              key={role.id}
                              control={form.control}
                              name="role_ids"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={role.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(role.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([
                                                ...field.value,
                                                role.id,
                                              ])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== role.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {role.name}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="permissions"
                className="flex-1 overflow-hidden pt-4"
              >
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  <FormField
                    control={form.control}
                    name="direct_permission_ids"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">
                            Direct Permissions
                          </FormLabel>
                          <FormDescription>
                            Specific permissions assigned directly to this user
                            (augmenting roles).
                          </FormDescription>
                        </div>
                        <div className="mb-4">
                          <Input
                            placeholder="Search permissions..."
                            value={permSearch}
                            onChange={(e) => setPermSearch(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {(permissions || [])
                            .filter(
                              (perm) =>
                                perm.name
                                  .toLowerCase()
                                  .includes(permSearch.toLowerCase()) ||
                                perm.codename
                                  .toLowerCase()
                                  .includes(permSearch.toLowerCase())
                            )
                            .map((perm) => (
                              <FormField
                                key={perm.id}
                                control={form.control}
                                name="direct_permission_ids"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={perm.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(
                                            perm.id
                                          )}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([
                                                  ...field.value,
                                                  perm.id,
                                                ])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== perm.id
                                                  )
                                                );
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {perm.name}{" "}
                                        <span className="text-xs text-muted-foreground">
                                          ({perm.codename})
                                        </span>
                                      </FormLabel>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>

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
                {initialData ? "Save Changes" : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
