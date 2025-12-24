"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { toast } from "sonner";
import { AlertModal } from "@/components/modals/alert-modal";
import { Badge } from "@/components/ui/badge";

interface Shift {
  id: string;
  name: string;
  code: string;
  branch_type: string;
  start_time: string;
  end_time: string;
  grace_time_in: number;
  grace_time_out: number;
  is_overnight: boolean;
}

export function ShiftClient() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const initialForm = {
    name: "",
    code: "",
    branch_type: "GENERAL",
    start_time: "09:00:00",
    end_time: "18:00:00",
    grace_time_in: 15,
    grace_time_out: 0,
    is_overnight: false,
  };
  const [formData, setFormData] = useState(initialForm);

  const [openAlert, setOpenAlert] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchShifts = async () => {
    try {
      const response = await api.get("/hrms/shifts/definitions/");
      setShifts(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to fetch shifts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleSubmit = async () => {
    try {
      if (editingShift) {
        await api.put(`/hrms/shifts/definitions/${editingShift.id}/`, formData);
        toast.success("Shift updated");
      } else {
        await api.post("/hrms/shifts/definitions/", formData);
        toast.success("Shift created");
      }
      setIsDialogOpen(false);
      setEditingShift(null);
      setFormData(initialForm);
      fetchShifts();
    } catch (error: any) {
      console.error("Shift operation failed", error.response?.data);
      const errorData = error.response?.data;
      const message = errorData
        ? typeof errorData === "object"
          ? JSON.stringify(errorData)
          : errorData
        : "Operation failed";
      toast.error(message);
    }
  };

  const onDelete = (id: string) => {
    setDeleteId(id);
    setOpenAlert(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      await api.delete(`/hrms/shifts/definitions/${deleteId}/`);
      toast.success("Shift deleted");
      fetchShifts();
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
      setOpenAlert(false);
      setDeleteId(null);
    }
  };

  const openEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      code: shift.code,
      branch_type: shift.branch_type,
      start_time: shift.start_time,
      end_time: shift.end_time,
      grace_time_in: shift.grace_time_in,
      grace_time_out: shift.grace_time_out,
      is_overnight: shift.is_overnight,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingShift(null);
    setFormData(initialForm);
    setIsDialogOpen(true);
  };

  const getBranchTypeBadge = (type: string) => {
    switch (type) {
      case "FACTORY":
        return <Badge variant="destructive">Factory</Badge>;
      case "STORE":
        return <Badge variant="secondary">Store</Badge>;
      case "WAREHOUSE":
        return <Badge variant="outline">Warehouse</Badge>;
      default:
        return <Badge variant="default">General</Badge>;
    }
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
        <h2 className="text-2xl font-bold tracking-tight">Shift Definitions</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Shift
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Grace In (m)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No shifts found.
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{shift.name}</span>
                      <span className="text-xs text-slate-500 uppercase font-mono">
                        {shift.code}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getBranchTypeBadge(shift.branch_type)}</TableCell>
                  <TableCell>{shift.start_time}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {shift.end_time}
                      {shift.is_overnight && (
                        <Badge variant="outline" className="text-[10px]">
                          Overnight
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{shift.grace_time_in}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(shift)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => onDelete(shift.id)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? "Edit Shift" : "Create Dynamic Shift"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Shift Name</Label>
                <Input
                  id="name"
                  placeholder="Morning Shift"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Short Code</Label>
                <Input
                  id="code"
                  placeholder="MOR"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Branch Type (Determines Availability)</Label>
              <Select
                onValueChange={(v) =>
                  setFormData({ ...formData, branch_type: v })
                }
                value={formData.branch_type}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General Office</SelectItem>
                  <SelectItem value="FACTORY">Factory</SelectItem>
                  <SelectItem value="STORE">Retail Store</SelectItem>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="time"
                  step="1"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">End Time</Label>
                <Input
                  id="end"
                  type="time"
                  step="1"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="grace">Grace Time In (Min)</Label>
                <Input
                  id="grace"
                  type="number"
                  value={formData.grace_time_in}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      grace_time_in: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-slate-50">
                <div className="flex flex-col">
                  <Label className="text-xs">Is Overnight?</Label>
                  <span className="text-[10px] text-slate-500">
                    Crosses midnight
                  </span>
                </div>
                <Switch
                  checked={formData.is_overnight}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, is_overnight: c })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Save Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
