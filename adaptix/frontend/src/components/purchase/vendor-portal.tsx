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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export const VendorPortal: React.FC = () => {
  const [rfqs, setRfqs] = React.useState<any[]>([]);
  const [vendors, setVendors] = React.useState<any[]>([]);
  const [myQuotes, setMyQuotes] = React.useState<any[]>([]);
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

      if (selectedVendor) {
        const quotesRes = await api.get("/purchase/quotes/", {
          params: { vendor: selectedVendor },
        });
        setMyQuotes(quotesRes.data || quotesRes.data.data || []);
      }
    } catch (error) {
      toast.error("Failed to load portal data");
    } finally {
      setLoading(false);
    }
  }, [selectedVendor]);

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
        valid_until: activeRfq.deadline,
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
            Select a vendor to view active RFQs and your submission history.
          </p>
        </div>
        <select
          className="bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          value={selectedVendor}
          onChange={(e) => setSelectedVendor(e.target.value)}
        >
          <option value="">Select Vendor...</option>
          {Array.isArray(vendors) &&
            vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
        </select>
      </div>

      <Tabs defaultValue="rfqs" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="rfqs">Active RFQs</TabsTrigger>
          <TabsTrigger value="quotes">My Quotes</TabsTrigger>
        </TabsList>

        <TabsContent value="rfqs" className="mt-6">
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
                      Deadline: {format(new Date(rfq.deadline), "PPp")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center bg-slate-100 p-2 rounded text-sm mb-3">
                      <span className="text-slate-500">Required:</span>
                      <span className="font-bold">{rfq.quantity} units</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px]">
                      {rfq.description || "No additional details provided."}
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
        </TabsContent>

        <TabsContent value="quotes" className="mt-6">
          <div className="space-y-4">
            {!selectedVendor ? (
              <div className="text-center py-12 border rounded-lg bg-slate-50">
                <p className="text-muted-foreground">
                  Select a vendor to view your quote history.
                </p>
              </div>
            ) : myQuotes.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-slate-50">
                <p className="text-muted-foreground">
                  You haven't submitted any quotes yet.
                </p>
              </div>
            ) : (
              <div className="grid items-start gap-4">
                {myQuotes.map((quote) => (
                  <Card
                    key={quote.id}
                    className={
                      quote.is_winning_quote
                        ? "border-green-500 bg-green-50/10"
                        : ""
                    }
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {quote.rfq_title || "Quotation"}
                        </CardTitle>
                        <CardDescription>
                          Submitted: {format(new Date(quote.created_at), "PPp")}
                        </CardDescription>
                      </div>
                      {quote.is_winning_quote && (
                        <Badge className="bg-green-600 text-white">
                          Winning Quote
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-8 text-sm">
                        <div>
                          <p className="text-muted-foreground">Price</p>
                          <p className="font-bold text-lg">
                            ${quote.unit_price}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Lead Time</p>
                          <p className="font-medium">
                            {quote.delivery_lead_time_days} days
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-muted-foreground">Your Notes</p>
                          <p className="text-slate-600 italic">
                            "{quote.notes || "N/A"}"
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Submit Quotation</DialogTitle>
            <DialogDescription>
              Provide your best offer for {activeRfq?.title}.
            </DialogDescription>
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
            <Button
              onClick={handleSubmitQuote}
              disabled={!selectedVendor || loading}
              className="gap-2"
            >
              <Send className="h-4 w-4" /> Send Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
