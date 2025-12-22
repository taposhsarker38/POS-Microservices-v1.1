"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Building2 } from "lucide-react";

interface Wing {
  id: string;
  name: string;
  code: string;
  pos_printer_name?: string;
  created_at: string;
}

export function WingSettings() {
  const [wings, setWings] = useState<Wing[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    pos_printer_name: "",
  });

  const fetchWings = async () => {
    try {
      const res = await api.get("/company/wings/");
      // Handle pagination or direct array
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setWings(data);
    } catch (error) {
      console.error("Failed to fetch wings:", error);
      setWings([]); // Ensure array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWings();
  }, []);

  const handleSubmit = async () => {
    try {
      await api.post("/company/wings/", formData);
      setOpen(false);
      setFormData({ name: "", code: "", pos_printer_name: "" });
      fetchWings();
    } catch (error) {
      console.error("Failed to create wing:", error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Branch Management (Wings)</CardTitle>
          <CardDescription>
            Manage your company branches and locations.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Branch</DialogTitle>
              <DialogDescription>
                Create a new location/wing for your business.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Branch Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Banani Branch"
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
                  placeholder="e.g. BANANI-01"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="printer">Default POS Printer</Label>
                <Input
                  id="printer"
                  value={formData.pos_printer_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pos_printer_name: e.target.value,
                    })
                  }
                  placeholder="e.g. EPSON-TM-T88"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Create Branch</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading branches...
          </div>
        ) : wings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium">No branches found</p>
            <p className="text-sm">
              Add a branch to start scaling your operations.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Printer</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wings.map((wing) => (
                <TableRow key={wing.id}>
                  <TableCell className="font-medium">{wing.name}</TableCell>
                  <TableCell>{wing.code}</TableCell>
                  <TableCell>{wing.pos_printer_name || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
