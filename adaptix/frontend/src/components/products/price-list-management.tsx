"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ListChecks } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { handleApiError } from "@/lib/api-handler";

export function PriceListManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);

  const [isItemsDialogOpen, setIsItemsDialogOpen] = React.useState(false);
  const [selectedList, setSelectedList] = React.useState<any | null>(null);
  const [variants, setVariants] = React.useState<any[]>([]);
  const [listItems, setListItems] = React.useState<Record<string, string>>({});

  // Data Fetching
  const { data: priceLists, isLoading } = useQuery({
    queryKey: ["product", "price-lists"],
    queryFn: () =>
      api
        .get("/product/price-lists/")
        .then((res) => res.data.results || res.data),
  });

  // Fetch Variants when managing items
  const openItemsManager = async (list: any) => {
    setSelectedList(list);
    try {
      const vRes = await api.get("/product/variants/");
      const allVariants = vRes.data.results || vRes.data;
      setVariants(allVariants);

      // Pre-fill existing prices
      const itemsMap: Record<string, string> = {};
      list.items?.forEach((item: any) => {
        itemsMap[item.variant_uuid] = String(item.price);
      });
      setListItems(itemsMap);
      setIsItemsDialogOpen(true);
    } catch (e) {
      toast.error("Failed to load products");
    }
  };

  const savePrices = async () => {
    try {
      for (const [vUuid, price] of Object.entries(listItems)) {
        if (!price) continue;
        await api.post("/product/price-list-items/", {
          price_list: selectedList.id,
          variant_uuid: vUuid,
          price: parseFloat(price),
        });
      }
      toast.success("Prices updated for " + selectedList.name);
      setIsItemsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["product", "price-lists"] });
    } catch (e: any) {
      toast.error(
        "Failed to save some prices. They might already exist or data is invalid."
      );
    }
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editingItem
        ? api.put(`/product/price-lists/${editingItem.id}/`, data)
        : api.post("/product/price-lists/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", "price-lists"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast.success(editingItem ? "Price List updated" : "Price List created");
    },
    onError: (error: any) => {
      handleApiError(error);
    },
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "List Name",
      cell: ({ row }) => (
        <span className="font-bold">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      id: "items_count",
      header: "Priced Products",
      cell: ({ row }) => <span>{row.original.items?.length || 0} items</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-blue-600 border-blue-200 bg-blue-50/50"
              onClick={() => openItemsManager(row.original)}
            >
              <ListChecks className="h-4 w-4" /> Manage Prices
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingItem(row.original);
                setIsDialogOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Price Lists</h3>
          <p className="text-xs text-muted-foreground">
            Define Retail, Wholesale, or VIP pricing tiers.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            setIsDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Price List
        </Button>

        {/* Create/Edit List Dialog */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Price List" : "Add New Price List"}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                saveMutation.mutate(data);
              }}
              className="space-y-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="name">List Name</Label>
                <Input
                  name="name"
                  defaultValue={editingItem?.name}
                  required
                  placeholder="e.g. Wholesale"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  name="description"
                  defaultValue={editingItem?.description}
                  placeholder="Notes about who this is for..."
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editingItem
                  ? "Update"
                  : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Manage Prices Dialog */}
        <Dialog open={isItemsDialogOpen} onOpenChange={setIsItemsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                Manage Prices for "{selectedList?.name}"
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {variants.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between border-b py-2 gap-4"
                >
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">
                      {v.product_name} - {v.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Base Price: {v.price} TK | SKU: {v.sku}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Custom Price:</Label>
                    <Input
                      type="number"
                      className="w-32 h-8"
                      placeholder={v.price}
                      value={listItems[v.id] || ""}
                      onChange={(e) =>
                        setListItems({ ...listItems, [v.id]: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsItemsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={savePrices}
                className="bg-green-600 hover:bg-green-700"
              >
                Apply Prices
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={priceLists || []}
        isLoading={isLoading}
        searchKey="name"
      />
    </div>
  );
}
