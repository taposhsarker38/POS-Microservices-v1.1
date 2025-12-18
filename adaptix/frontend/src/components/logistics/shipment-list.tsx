"use client";

import { useEffect, useState } from "react";
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
} from "@/components/ui/dialog";
import { Plus, Search, Package } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const shipmentSchema = z.object({
  order_uuid: z.string().min(1, "Order ID required"),
  customer_name: z.string().min(1, "Customer Name required"),
  customer_phone: z.string().min(1, "Phone required"),
  destination_address: z.string().min(5, "Address required"),
  status: z.enum(["PENDING", "PACKED", "SHIPPED", "DELIVERED", "RETURNED"]),
});

type ShipmentFormValues = z.infer<typeof shipmentSchema>;

function ShipmentForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      order_uuid: "",
      customer_name: "",
      customer_phone: "",
      destination_address: "",
      status: "PENDING",
    },
  });

  const onSubmit = async (values: ShipmentFormValues) => {
    try {
      await api.post("/logistics/shipments/", values);
      toast.success("Shipment created");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create shipment");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="order_uuid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order UUID</FormLabel>
              <FormControl>
                <Input placeholder="Order-123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customer_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customer_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="destination_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery Address</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Create Shipment</Button>
        </div>
      </form>
    </Form>
  );
}

export function ShipmentList() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const fetchShipments = () => {
    api
      .get("/logistics/shipments/")
      .then((res) => setShipments(res.data.results || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search shipments..." className="pl-8" />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Shipment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Shipment</DialogTitle>
            </DialogHeader>
            <ShipmentForm
              onSuccess={() => {
                setOpen(false);
                fetchShipments();
              }}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Route</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-24 text-muted-foreground"
                >
                  No shipments found.
                </TableCell>
              </TableRow>
            ) : (
              shipments.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">
                    {s.tracking_number}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{s.customer_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.customer_phone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className="max-w-xs truncate"
                    title={s.destination_address}
                  >
                    {s.destination_address}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800`}
                    >
                      {s.status}
                    </span>
                  </TableCell>
                  <TableCell>{s.route || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
