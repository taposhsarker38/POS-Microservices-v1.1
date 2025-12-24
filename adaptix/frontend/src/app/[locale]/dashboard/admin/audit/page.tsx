"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditLog {
  id: number;
  user_id: string;
  username: string;
  service_name: string;
  method: string;
  path: string;
  status_code: number;
  created_at: string;
  ip: string;
  hash: string;
  previous_hash: string;
}

const columns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: "created_at",
    header: "Timestamp",
    cell: ({ row }) => new Date(row.getValue("created_at")).toLocaleString(),
  },
  {
    accessorKey: "service_name",
    header: "Service",
    cell: ({ row }) => (
      <Badge variant="outline" className="uppercase">
        {row.getValue("service_name")}
      </Badge>
    ),
  },
  {
    accessorKey: "username",
    header: "User",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">
          {row.getValue("username") || "Unknown"}
        </span>
        <span className="text-xs text-muted-foreground">
          {row.original.user_id}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Badge
          className={
            row.original.method === "DELETE"
              ? "bg-red-500"
              : row.original.method === "POST"
              ? "bg-green-500"
              : row.original.method === "PUT" || row.original.method === "PATCH"
              ? "bg-orange-500"
              : "bg-blue-500"
          }
        >
          {row.original.method}
        </Badge>
        <span
          className="text-sm font-mono truncate max-w-[200px]"
          title={row.original.path}
        >
          {row.original.path}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "status_code",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status_code") as number;
      return (
        <Badge variant={status >= 400 ? "destructive" : "default"}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "hash",
    header: "Integrity",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.hash ? (
          <Badge className="bg-blue-600 hover:bg-blue-700">
            <svg
              className="w-3 h-3 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Signed
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Legacy
          </Badge>
        )}
      </div>
    ),
  },
];

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      let url = `${process.env.NEXT_PUBLIC_API_URL}/auth/audit/logs/`;
      if (serviceFilter !== "all") {
        url += `?service_name=${serviceFilter}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.results || json); // Handle pagination or list
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [serviceFilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Monitor system-wide user activities and security events.
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <CardTitle>Activity History</CardTitle>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* @ts-ignore */}
          <DataTable columns={columns} data={data} filterKey="username" />
        </CardContent>
      </Card>
    </div>
  );
}
