"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash, Settings2, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AttributeSet {
  id: string;
  name: string;
  attributes: Attribute[];
}

interface Attribute {
  id: string;
  name: string;
  code: string;
  type: string;
  options: string[];
  is_required: boolean;
}

const ENTITY_CONFIG = {
  products: { label: "Products", api: "/product" },
  customers: { label: "Customers", api: "/customer" },
  employees: { label: "Employees", api: "/hrms/employees" },
};

export function CustomFieldsSettings() {
  const [selectedEntity, setSelectedEntity] =
    useState<keyof typeof ENTITY_CONFIG>("products");
  const [attributeSets, setAttributeSets] = useState<AttributeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [selectedSet, setSelectedSet] = useState<AttributeSet | null>(null);
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  const [newAttr, setNewAttr] = useState({
    name: "",
    code: "",
    type: "text",
    is_required: false,
  });

  useEffect(() => {
    fetchAttributeSets();
  }, [selectedEntity]);

  const fetchAttributeSets = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `${ENTITY_CONFIG[selectedEntity].api}/attribute-sets/`
      );
      setAttributeSets(response.data.results || response.data);
    } catch (error) {
      toast.error("Failed to load custom fields");
    } finally {
      setLoading(false);
    }
  };

  const createSet = async () => {
    try {
      const response = await api.post(
        `${ENTITY_CONFIG[selectedEntity].api}/attribute-sets/`,
        {
          name: newSetName,
          company_uuid: "00000000-0000-0000-0000-000000000000",
        }
      );
      setAttributeSets([...attributeSets, response.data]);
      setNewSetName("");
      setIsModalOpen(false);
      toast.success("Attribute set created");
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.name?.[0] ||
        error.response?.data?.detail ||
        "Failed to create set";
      toast.error(errorMsg);
    }
  };

  const deleteSet = async (id: string) => {
    try {
      await api.delete(
        `${ENTITY_CONFIG[selectedEntity].api}/attribute-sets/${id}/`
      );
      setAttributeSets(attributeSets.filter((s) => s.id !== id));
      toast.success("Set deleted");
    } catch (error) {
      toast.error("Failed to delete set");
    }
  };

  const addAttribute = async () => {
    if (!selectedSet) return;
    try {
      const response = await api.post(
        `${ENTITY_CONFIG[selectedEntity].api}/attributes/`,
        {
          ...newAttr,
          attribute_set: selectedSet.id,
          code: newAttr.code || newAttr.name.toLowerCase().replace(/\s+/g, "_"),
          company_uuid: "00000000-0000-0000-0000-000000000000",
        }
      );

      const updatedSets = attributeSets.map((s) => {
        if (s.id === selectedSet.id) {
          return { ...s, attributes: [...(s.attributes || []), response.data] };
        }
        return s;
      });
      setAttributeSets(updatedSets);
      setSelectedSet(updatedSets.find((s) => s.id === selectedSet.id) || null);
      setNewAttr({ name: "", code: "", type: "text", is_required: false });
      toast.success("Attribute added");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to add attribute");
    }
  };

  const deleteAttribute = async (attrId: string) => {
    if (!selectedSet) return;
    try {
      await api.delete(
        `${ENTITY_CONFIG[selectedEntity].api}/attributes/${attrId}/`
      );
      const updatedSets = attributeSets.map((s) => {
        if (s.id === selectedSet.id) {
          return {
            ...s,
            attributes: s.attributes.filter((a) => a.id !== attrId),
          };
        }
        return s;
      });
      setAttributeSets(updatedSets);
      setSelectedSet(updatedSets.find((s) => s.id === selectedSet.id) || null);
      toast.success("Attribute removed");
    } catch (error) {
      toast.error("Failed to remove attribute");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="w-[200px]">
          <Label>Select Entity</Label>
          <Select
            value={selectedEntity}
            onValueChange={(v: any) => setSelectedEntity(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ENTITY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Attribute Set
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Attribute Set</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Set Name (e.g. Pharmacy Specs)</Label>
                <Input
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder="Enter name..."
                />
              </div>
              <Button onClick={createSet} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {attributeSets.map((set) => (
            <Card key={set.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">{set.name}</CardTitle>
                  <CardDescription>
                    {set.attributes?.length || 0} fields configured
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedSet(set);
                      setIsFieldsModalOpen(true);
                    }}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Manage Fields
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteSet(set.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
          {attributeSets.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
              No custom fields defined for {ENTITY_CONFIG[selectedEntity].label}
              .
            </div>
          )}
        </div>
      )}

      {/* Fields Management Modal */}
      <Dialog open={isFieldsModalOpen} onOpenChange={setIsFieldsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Fields for {selectedSet?.name}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-4 py-4 border-b">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={newAttr.name}
                onChange={(e) =>
                  setNewAttr({ ...newAttr, name: e.target.value })
                }
                placeholder="Field Label"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newAttr.type}
                onValueChange={(v) => setNewAttr({ ...newAttr, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="boolean">Boolean (Yes/No)</SelectItem>
                  <SelectItem value="select">Select Menu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Required?</Label>
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  checked={newAttr.is_required}
                  onChange={(e) =>
                    setNewAttr({ ...newAttr, is_required: e.target.checked })
                  }
                  className="h-4 w-4"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={addAttribute} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
            {selectedSet?.attributes?.map((attr) => (
              <div
                key={attr.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900"
              >
                <div>
                  <p className="font-medium">
                    {attr.name}{" "}
                    <span className="text-xs text-muted-foreground uppercase">
                      ({attr.type})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Code: {attr.code}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => deleteAttribute(attr.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {(!selectedSet?.attributes ||
              selectedSet.attributes.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No fields added yet.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
