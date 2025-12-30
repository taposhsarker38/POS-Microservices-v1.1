"use client";

import * as React from "react";
import { Search, Keyboard } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ProductGridProps {
  onAddToCart: (product: any) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ onAddToCart }) => {
  const [products, setProducts] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const searchRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.get("product/products/"),
        api.get("product/categories/"),
      ]);

      const prods = Array.isArray(prodRes.data.data)
        ? prodRes.data.data
        : Array.isArray(prodRes.data)
        ? prodRes.data
        : [];

      const cats = Array.isArray(catRes.data.data)
        ? catRes.data.data
        : Array.isArray(catRes.data)
        ? catRes.data
        : [];

      setProducts(prods);
      setCategories(cats);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" ||
      String(p.category) === categoryFilter ||
      String(p.category?.id) === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Reset selection when filter changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [search, categoryFilter]);

  // Keyboard Navigation Logic
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" &&
        e.key !== "ArrowDown" &&
        e.key !== "Enter"
      )
        return;

      if (e.key === "ArrowRight") {
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredProducts.length - 1)
        );
      } else if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "ArrowDown") {
        setSelectedIndex((prev) =>
          Math.min(prev + 4, filteredProducts.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        setSelectedIndex((prev) => Math.max(prev - 4, 0));
      } else if (e.key === "Enter" && filteredProducts[selectedIndex]) {
        onAddToCart(filteredProducts[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredProducts, selectedIndex]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/10">
      <div className="p-3 border-b bg-white dark:bg-slate-950 flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            ref={searchRef}
            placeholder="Search SKU or Name... [/]"
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
          <Badge variant="secondary" className="font-mono px-1 h-5 text-[10px]">
            ALT+S
          </Badge>{" "}
          Search
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">
              Fetching Inventory...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((product, idx) => (
              <div
                key={product.id}
                className={cn(
                  "group relative flex flex-col cursor-pointer overflow-hidden rounded-lg border bg-white dark:bg-slate-950 transition-all active:scale-95",
                  selectedIndex === idx
                    ? "ring-2 ring-primary border-primary shadow-lg scale-[1.02] z-10"
                    : "hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                )}
                onClick={() => onAddToCart(product)}
              >
                <div className="aspect-square bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-3xl font-extrabold text-slate-200 dark:text-slate-800 shrink-0">
                  {product.sku
                    ? product.sku.substring(0, 2)
                    : product.name.substring(0, 2).toUpperCase()}
                  {selectedIndex === idx && (
                    <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded shadow-lg">
                      <Keyboard className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="p-2 flex flex-col justify-between flex-1">
                  <div>
                    <h3
                      className="font-bold text-sm leading-tight text-slate-800 dark:text-slate-200 truncate"
                      title={product.name}
                    >
                      {product.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      {product.sku || "NO SKU"}
                    </p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="font-extrabold text-primary text-sm">
                      ${Number(product.sales_price || 0).toFixed(2)}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {product.is_tax_exempt && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-[8px] border-emerald-500 text-emerald-600 bg-emerald-50"
                        >
                          TAX FREE
                        </Badge>
                      )}
                      {product.is_emi_eligible === false && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-[8px] border-orange-500 text-orange-600 bg-orange-50"
                        >
                          NO EMI
                        </Badge>
                      )}
                      {product.stock_quantity <=
                        (product.alert_quantity || 0) && (
                        <Badge
                          variant="destructive"
                          className="h-4 px-1 text-[8px]"
                        >
                          LOW
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full border-2 border-dashed rounded-xl py-20 text-center">
                <p className="text-muted-foreground">
                  Found nothing for "{search}"
                </p>
                <Button
                  variant="link"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Keyboard Status Bar */}
      <div className="h-8 border-t bg-white dark:bg-slate-950 px-4 flex items-center justify-between text-[10px] font-medium text-slate-500 uppercase tracking-wider">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
              Arrows
            </kbd>{" "}
            Nav
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
              Enter
            </kbd>{" "}
            Add
          </span>
        </div>
        <div className="flex gap-4">
          <span>{filteredProducts.length} Items Available</span>
        </div>
      </div>
    </div>
  );
};
