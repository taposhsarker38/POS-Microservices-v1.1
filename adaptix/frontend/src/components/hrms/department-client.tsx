"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";
import { AlertModal } from "@/components/modals/alert-modal";

interface Department {
  id: string;
  name: string;
  code: string;
}

export function DepartmentClient() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "" });

  const [openAlert, setOpenAlert] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/hrms/employees/departments/");
      setDepartments(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to fetch departments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Auto-generate code from name if code is empty and we are creating (not editing)
  useEffect(() => {
    if (!editingDept && formData.name) {
      if (!formData.code) {
        const generatedCode = formData.name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .substring(0, 50);
        setFormData((prev) => ({ ...prev, code: generatedCode }));
      }
    }
  }, [formData.name, editingDept]); // Removed formData.code to avoid infinite loop if we were checking it differently, but checking !formData.code inside is safe. However, to be safe against deps, we only trigger on name change.

  const handleSubmit = async () => {
    try {
      if (editingDept) {
        await api.put(
          `/hrms/employees/departments/${editingDept.id}/`,
          formData
        );
        toast.success("Department updated");
      } else {
        await api.post("/hrms/employees/departments/", formData);
        toast.success("Department created");
      }
      setIsDialogOpen(false);
      setEditingDept(null);
      setFormData({ name: "", code: "" });
      fetchDepartments();
    } catch (error) {
      toast.error("Operation failed");
    }
  };

  const onDelete = (id: string) => {
    setDeleteId(id);
    setOpenAlert(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      await api.delete(`/hrms/employees/departments/${deleteId}/`);
      toast.success("Department deleted");
      fetchDepartments();
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
      setOpenAlert(false);
      setDeleteId(null);
    }
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, code: dept.code });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingDept(null);
    setFormData({ name: "", code: "" });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <AlertModal
        isOpen={openAlert}
        onClose={() => setOpenAlert(false)}
        onConfirm={confirmDelete}
        loading={loading}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Departments</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Department
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  No departments found.
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>{dept.code}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(dept)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => onDelete(dept.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDept ? "Edit Department" : "Add Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
