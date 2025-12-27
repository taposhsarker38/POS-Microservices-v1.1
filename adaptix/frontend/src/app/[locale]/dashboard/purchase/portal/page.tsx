"use client";

import { VendorPortal } from "@/components/purchase/vendor-portal";

export default function VendorPortalPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Vendor Collaboration Portal</h1>
          <p className="text-muted-foreground">
            Manage your bids and supply requests.
          </p>
        </div>
      </div>
      <VendorPortal />
    </div>
  );
}
