"use client";

import React from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";

interface DynamicAttributeRendererProps {
  form: UseFormReturn<any>;
  attributeSet: {
    id: string;
    name: string;
    attributes: Array<{
      id: string;
      name: string;
      code: string;
      type: "text" | "number" | "date" | "select" | "boolean";
      options?: string[];
      is_required?: boolean;
    }>;
  };
  basePath?: string; // e.g., "attributes"
}

export const DynamicAttributeRenderer: React.FC<
  DynamicAttributeRendererProps
> = ({ form, attributeSet, basePath = "attributes" }) => {
  if (!attributeSet || !attributeSet.attributes) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
      <div className="col-span-full">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Custom Fields: {attributeSet.name}
        </h3>
      </div>
      {attributeSet.attributes.map((attr) => (
        <FormField
          key={attr.id}
          control={form.control}
          name={`${basePath}.${attr.code}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {attr.name}{" "}
                {attr.is_required && (
                  <span className="text-destructive">*</span>
                )}
              </FormLabel>
              <FormControl>
                {(() => {
                  switch (attr.type) {
                    case "text":
                      return (
                        <Input
                          placeholder={attr.name}
                          {...field}
                          value={field.value || ""}
                        />
                      );
                    case "number":
                      return (
                        <Input
                          type="number"
                          placeholder={attr.name}
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      );
                    case "date":
                      return (
                        <Input
                          type="date"
                          {...field}
                          value={field.value || ""}
                        />
                      );
                    case "boolean":
                      return (
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      );
                    case "select":
                      return (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${attr.name}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {attr.options?.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    default:
                      return <Input {...field} />;
                  }
                })()}
              </FormControl>
              {attr.type === "boolean" && (
                <div className="text-sm text-muted-foreground italic mt-1 pb-2">
                  Check for Yes
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
};
