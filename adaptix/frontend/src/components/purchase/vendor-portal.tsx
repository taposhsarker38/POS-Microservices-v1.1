"use client";

import * as React from "react";
import { Gavel, Send, Clock, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const VendorPortal: React.FC = () => {
  const [rfqs, setRfqs] = React.useState<any[]>([]);
  const [vendors, setVendors] = React.useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = React.useState(false);
  const [activeRfq, setActiveRfq] = React.useState<any>(null);

  const [quoteForm, setQuoteForm] = React.useState({
    unit_price: "",
    delivery_lead_time_days: "",
    notes: "",
  });

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [rfqRes, vendorRes] = await Promise.all([
        api.get("/purchase/rfqs/"),
        api.get("/purchase/vendors/"),
      ]);
      setRfqs(
        (rfqRes.data || rfqRes.data.data)?.filter(
          (r: any) => r.status === "open"
        )
      );
      setVendors(vendorRes.data || vendorRes.data.data);
    } catch (error) {
      toast.error("Failed to load portal data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitQuote = async () => {
    if (!selectedVendor) {
      toast.error("Please select your vendor identity");
      return;
    }

    try {
      await api.post("/purchase/quotes/", {
        rfq: activeRfq.id,
        vendor: selectedVendor,
        unit_price: quoteForm.unit_price,
        delivery_lead_time_days: quoteForm.delivery_lead_time_days,
        valid_until: activeRfq.deadline, // Simple mock
        notes: quoteForm.notes,
      });
      toast.success("Quote submitted successfully!");
      setIsQuoteModalOpen(false);
      setQuoteForm({ unit_price: "", delivery_lead_time_days: "", notes: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to submit quote");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-center gap-3">
        <AlertTriangle className="text-amber-500 h-5 w-5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            Vendor Simulation Mode
          </p>
          <p className="text-xs text-amber-700">
            In a live system, vendors would have their own login. Select a
            vendor below to act as them.
          </p>
        </div>
        <select
          className="bg-white border rounded px-2 py-1 text-sm"
          value={selectedVendor}
          onChange={(e) => setSelectedVendor(e.target.value)}
        >
          <option value="">Select Vendor...</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rfqs.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground bg-slate-50 rounded-xl border-2 border-dashed">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No active Requests for Quotes at this time.</p>
          </div>
        ) : (
          rfqs.map((rfq) => (
            <Card key={rfq.id}>
              <CardHeader>
                <CardTitle className="text-lg">{rfq.title}</CardTitle>
                <CardDescription>
                  Deadline: {format(new Date(rfq.deadline), "PP")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center bg-slate-100 p-2 rounded text-sm">
                  <span className="text-slate-500">Requested Quantity:</span>
                  <span className="font-bold">{rfq.quantity} units</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                  {rfq.description}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => {
                    setActiveRfq(rfq);
                    setIsQuoteModalOpen(true);
                  }}
                >
                  <Gavel className="h-4 w-4" /> Submit Quote
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Unit Price ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={quoteForm.unit_price}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, unit_price: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Lead Time (Days)</Label>
              <Input
                type="number"
                placeholder="e.g. 5"
                value={quoteForm.delivery_lead_time_days}
                onChange={(e) =>
                  setQuoteForm({
                    ...quoteForm,
                    delivery_lead_time_days: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Notes / Terms</Label>
              <Textarea
                placeholder="Any special conditions..."
                value={quoteForm.notes}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsQuoteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitQuote} disabled={!selectedVendor}>
              <Send className="h-4 w-4 mr-2" /> Send Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
