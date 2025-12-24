"use client";

import { Product } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { theme } = useTheme();
  // Use first variant for price/display if available
  const mainVariant = product.variants?.[0];
  const price = mainVariant?.price || "0.00";
  const hasMultipleVariants = product.variants?.length > 1;

  // Generate a soft glow based on product name hash for unique feel
  const glowColor = stringToColor(product.name);

  return (
    <div className="group relative">
      {/* Glow Effect */}
      <div
        className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-75 blur duration-500 transition-all"
        style={{
          background: `linear-gradient(to right, ${
            theme.primary_color || "#8b5cf6"
          }, ${theme.secondary_color || "#a78bfa"})`,
        }}
      />

      <Card className="relative overflow-hidden h-full border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-all duration-300 group-hover:translate-y-[-4px]">
        {/* Image Area */}
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300 dark:text-slate-600">
              <ShoppingBag className="h-12 w-12 opacity-50" />
            </div>
          )}

          {/* Price Tag with Glassmorphism */}
          <div className="absolute top-3 right-3">
            <Badge
              variant="secondary"
              className="text-sm font-bold bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-sm border border-white/20 px-3 py-1"
            >
              ${price}
            </Badge>
          </div>

          {/* Quick Add Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full transition-transform duration-300 group-hover:translate-y-0 bg-gradient-to-t from-black/60 to-transparent">
            <Button
              onClick={() => onAddToCart(product)}
              className="w-full shadow-lg hover:shadow-xl transition-all active:scale-95 bg-white text-black hover:bg-white/90 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="space-y-1">
            <h3
              className="font-bold text-slate-800 dark:text-slate-100 truncate text-base leading-tight"
              title={product.name}
            >
              {product.name}
            </h3>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate uppercase tracking-wider">
                {product.category_name || "General"}
              </p>
              {hasMultipleVariants && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {product.variants.length} Options
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to generate consistent pastel color from string
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}
