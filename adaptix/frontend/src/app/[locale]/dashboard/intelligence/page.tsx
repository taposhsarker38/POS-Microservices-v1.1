"use client";

import { AIClient } from "@/components/intelligence/ai-client";
import { AnomalyAlert } from "@/components/intelligence/anomaly-alert";
import { LiveFeed } from "@/components/intelligence/live-feed";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Brain } from "lucide-react";

export default function IntelligenceHubPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-violet-600" />
            Intelligence Hub
          </h2>
          <div className="flex items-center text-muted-foreground mt-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Intelligence</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Alerts from various intelligence modules */}
          <AnomalyAlert />

          {/* Main Hub Client with multiple modules */}
          <AIClient />
        </div>

        <div className="lg:col-span-1">
          <LiveFeed />
        </div>
      </div>
    </div>
  );
}
