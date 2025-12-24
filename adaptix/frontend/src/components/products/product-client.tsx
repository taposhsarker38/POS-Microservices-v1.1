"use client";

import * as React from "react";
import { Plus, Pencil, ArrowUpDown } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ProductForm } from "@/components/products/product-form";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ProductClient: React.FC = () => {
  const [data, setData] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [units, setUnits] = React.useState<any[]>([]);
  const [attributeSets, setAttributeSets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<any>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, catsRes, brandsRes, unitsRes, attributeSetsRes] =
        await Promise.all([
          api.get("/product/products/"),
          api.get("/product/categories/"),
          api.get("/product/brands/"),
          api.get("/product/units/"),
          api.get("/product/attribute-sets/"),
        ]);

      const prods = Array.isArray(productsRes.data.data)
        ? productsRes.data.data
        : Array.isArray(productsRes.data)
        ? productsRes.data
        : [];

      const cats = Array.isArray(catsRes.data.data)
        ? catsRes.data.data
        : Array.isArray(catsRes.data)
        ? catsRes.data
        : [];

      const br = Array.isArray(brandsRes.data.data)
        ? brandsRes.data.data
        : Array.isArray(brandsRes.data)
        ? brandsRes.data
        : [];

      const un = Array.isArray(unitsRes.data.data)
        ? unitsRes.data.data
        : Array.isArray(unitsRes.data)
        ? unitsRes.data
        : [];

      const attrSets = Array.isArray(attributeSetsRes.data.results)
        ? attributeSetsRes.data.results
        : Array.isArray(attributeSetsRes.data)
        ? attributeSetsRes.data
        : [];

      setData(prods);
      setCategories(cats);
      setBrands(br);
      setUnits(un);
      setAttributeSets(attrSets);
    } catch (error) {
      console.error("Failed to fetch product data", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onEdit = (product: any) => {
    setSelectedProduct(product);
    setOpen(true);
  };

  const onCreate = () => {
    setSelectedProduct(null);
    setOpen(true);
  };

  const handleModalClose = () => {
    setOpen(false);
    fetchData();
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "thumbnail",
      header: "Image",
      cell: ({ row }) =>
        row.original.thumbnail ? (
          <img
            src={row.original.thumbnail}
            alt=""
            className="h-10 w-10 object-cover rounded"
          />
        ) : (
          <div className="h-10 w-10 bg-secondary rounded" />
        ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-0 font-medium"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
    },
    {
      accessorKey: "category_name",
      header: "Category",
      cell: ({ row }) => row.original.category_name || "N/A",
    },
    {
      accessorKey: "brand_name",
      header: "Brand",
      cell: ({ row }) => row.original.brand_name || "N/A",
    },
    {
      accessorKey: "product_type",
      header: "Type",
      cell: ({ row }) => (
        <span className="capitalize">{row.original.product_type}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
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
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">Manage your product catalog.</p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>
      <div className="mt-8">
        <DataTable
          searchKey="name"
          columns={columns}
          data={data}
          enableExport={true}
          exportFileName="product_list"
        />
      </div>
      <ProductForm
        categories={categories}
        brands={brands}
        units={units}
        attributeSets={attributeSets}
        initialData={selectedProduct}
        isOpen={open}
        onClose={handleModalClose}
      />
    </>
  );
};
