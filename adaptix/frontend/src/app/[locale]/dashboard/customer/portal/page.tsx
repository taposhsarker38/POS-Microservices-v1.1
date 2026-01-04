"use client";

import { CustomerPortal } from "@/components/customer/customer-portal";

export default function CustomerPortalPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Portal</h1>
          <p className="text-muted-foreground">
            Manage your profile, track loyalty rewards, and view your purchase
            history.
          </p>
        </div>
      </div>
      <CustomerPortal />
    </div>
  );
}
