"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InspectionList } from "./inspection-list";
import { QualityStandardList } from "./standard-list";

export function QualityClient() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quality Control</h1>
          <p className="text-muted-foreground">
            Manage quality standards and inspections.
          </p>
        </div>
      </div>

      <Tabs defaultValue="inspections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="standards">Quality Standards</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Log</CardTitle>
              <CardDescription>
                Recent quality inspections and their results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InspectionList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Standards</CardTitle>
              <CardDescription>
                Define acceptance criteria for products.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QualityStandardList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
