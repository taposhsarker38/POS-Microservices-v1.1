"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StandardForm } from "./standard-form";

export function QualityStandardList() {
  const [data, setData] = useState([]);
  const [products, setProducts] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      const [stdRes, prodRes] = await Promise.all([
        api.get("/quality/standards/"),
        api.get("/product/products/"), // Assuming product service access
      ]);
      setData(stdRes.data);

      const prodMap: Record<string, string> = {};
      prodRes.data.results?.forEach((p: any) => (prodMap[p.id] = p.name));
      setProducts(prodMap);
    } catch (error) {
      console.error("Failed to fetch standards", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Standard Name",
    },
    {
      accessorKey: "product_uuid",
      header: "Product",
      cell: ({ row }) =>
        products[row.original.product_uuid] || row.original.product_uuid,
    },
    {
      accessorKey: "criteria",
      header: "Criteria",
    },
  ];

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Standard
        </Button>
      </div>
      <DataTable columns={columns} data={data} searchKey="name" />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Define Quality Standard</DialogTitle>
          </DialogHeader>
          <StandardForm
            onSuccess={() => {
              setIsDialogOpen(false);
              fetchData();
            }}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
