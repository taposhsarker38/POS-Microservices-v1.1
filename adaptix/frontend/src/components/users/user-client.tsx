"use client";

import * as React from "react";
import { Plus, Pencil, ArrowUpDown } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { UserForm } from "@/components/users/user-form";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export const UserClient: React.FC = () => {
  const [data, setData] = React.useState<any[]>([]);
  const [roles, setRoles] = React.useState<any[]>([]);
  const [permissions, setPermissions] = React.useState<any[]>([]);
  const [branches, setBranches] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<any>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, permsRes, branchesRes] = await Promise.all([
        api.get("/auth/users/"),
        api.get("/auth/roles/"),
        api.get("/auth/permissions/"),
        api.get("/company/wings/"),
      ]);
      setData(Array.isArray(usersRes.data.data) ? usersRes.data.data : []);
      setRoles(Array.isArray(rolesRes.data.data) ? rolesRes.data.data : []);
      setPermissions(
        Array.isArray(permsRes.data.data) ? permsRes.data.data : []
      );
      setBranches(branchesRes.data.results || branchesRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onEdit = (user: any) => {
    setSelectedUser(user);
    setOpen(true);
  };

  const handleModalClose = () => {
    setOpen(false);
    fetchData();
  };

  const onCreate = () => {
    setSelectedUser(null);
    setOpen(true);
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "username",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent px-0 font-medium whitespace-nowrap"
          >
            Username
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent px-0 font-medium whitespace-nowrap"
          >
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
    },
    {
      id: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const userRoles = row.original.roles || [];
        return (
          <div className="flex gap-1 flex-wrap">
            {userRoles.map((r: any) => (
              <span
                key={r.id}
                className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs"
              >
                {r.name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "company.name",
      header: "Company",
      cell: ({ row }) => row.original.company?.name || "N/A",
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            row.original.is_active
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {row.original.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      accessorKey: "is_terminal",
      header: "Terminal",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            row.original.is_terminal
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {row.original.is_terminal ? "Yes" : "No"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onEdit(row.original)}
                className="cursor-pointer"
              >
                <Pencil className="mr-2 h-4 w-4" /> Manage Access
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>
      <div className="mt-8">
        <DataTable searchKey="username" columns={columns} data={data} />
      </div>
      <UserForm
        roles={roles}
        permissions={permissions}
        branches={branches}
        initialData={selectedUser}
        isOpen={open}
        onClose={handleModalClose}
      />
    </>
  );
};
