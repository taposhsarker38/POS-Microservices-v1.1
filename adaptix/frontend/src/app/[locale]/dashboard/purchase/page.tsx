"use client";

import { PurchaseOrderClient } from "@/components/purchase/purchase-order-client";

export default function PurchasePage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <PurchaseOrderClient />
    </div>
  );
}
