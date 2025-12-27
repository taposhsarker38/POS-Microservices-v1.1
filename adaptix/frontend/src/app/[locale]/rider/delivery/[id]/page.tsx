"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Phone,
  ArrowLeft,
  Camera,
  PenTool,
  CheckCircle,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  // In a real app, use a canvas ref for signature
  // For this prototype, we'll use a simple file input for signature too
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        const res = await api.get(
          `/logistics/shipping/rider/shipments/${params.id}/`
        );
        setDelivery(res.data);
      } catch (error) {
        toast.error("Failed to load delivery details");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchDelivery();
  }, [params.id]);

  const handleCompleteDelivery = async () => {
    if (!delivery) return;

    setSubmitting(true);
    const formData = new FormData();
    if (proofFile) formData.append("proof_of_delivery", proofFile);
    if (signatureFile) formData.append("signature", signatureFile);
    formData.append("delivery_notes", notes);

    // Mock Geo Location
    formData.append(
      "geo_location",
      JSON.stringify({ lat: 23.8103, lng: 90.4125 })
    );

    try {
      await api.post(
        `/logistics/shipping/rider/shipments/${delivery.id}/complete-delivery/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      toast.success("Delivery confirmed!");
      router.push("/rider");
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );

  if (!delivery) return <div>Delivery not found</div>;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-slate-800"
            onClick={() => router.back()}
          >
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="font-bold text-lg">
              Delivery #{delivery.tracking_number.slice(0, 6)}
            </h1>
            <span className="text-xs text-slate-400 capitalize">
              {delivery.status.toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Customer Info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-xs text-slate-500 uppercase font-bold">
                Customer
              </Label>
              <h2 className="text-xl font-bold">{delivery.customer_name}</h2>
              <a
                href={`tel:${delivery.customer_phone}`}
                className="flex items-center gap-2 text-blue-600 mt-1"
              >
                <Phone className="h-4 w-4" /> {delivery.customer_phone}
              </a>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                <p className="text-sm text-slate-700 font-medium">
                  {delivery.destination_address}
                </p>
              </div>
              <Button
                className="w-full mt-3 gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() =>
                  window.open(
                    `http://maps.google.com/?q=${delivery.destination_address}`
                  )
                }
              >
                <Navigation className="h-4 w-4" /> Start Navigation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Action Form */}
        {delivery.status !== "DELIVERED" ? (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Proof of Delivery</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50 active:bg-slate-100 cursor-pointer relative">
                <Camera className="h-8 w-8 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-600">
                  Take Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 w-full h-full"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
                {proofFile && (
                  <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-green-500" />
                )}
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50 active:bg-slate-100 cursor-pointer relative">
                <PenTool className="h-8 w-8 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-600">
                  Signature
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 w-full h-full"
                  onChange={(e) =>
                    setSignatureFile(e.target.files?.[0] || null)
                  }
                />
                {signatureFile && (
                  <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-green-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delivery Notes</Label>
              <Textarea
                placeholder="Left at front door..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="bg-green-50 text-green-700 p-6 rounded-xl text-center border border-green-200">
            <CheckCircle className="h-12 w-12 mx-auto mb-2" />
            <h3 className="font-bold text-lg">Delivered Successfully</h3>
            <p className="text-sm opacity-80">
              at {new Date(delivery.delivered_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {delivery.status !== "DELIVERED" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t safe-area-bottom">
          <Button
            size="lg"
            className="w-full bg-slate-900 text-white font-bold h-12 shadow-lg"
            onClick={handleCompleteDelivery}
            disabled={submitting}
          >
            {submitting ? "Processing..." : "Confirm Delivery"}
          </Button>
        </div>
      )}
    </div>
  );
}
