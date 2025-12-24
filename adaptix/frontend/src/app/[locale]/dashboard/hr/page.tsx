"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeClient } from "@/components/hrms/employee-client";
import { DepartmentClient } from "@/components/hrms/department-client";
import { PositionClient } from "@/components/hrms/position-client";
import { ShiftClient } from "@/components/hrms/shift-client";

export default function HRPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Human Resources</h2>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="space-y-4">
          <EmployeeClient />
        </TabsContent>
        <TabsContent value="departments" className="space-y-4">
          <DepartmentClient />
        </TabsContent>
        <TabsContent value="positions" className="space-y-4">
          <PositionClient />
        </TabsContent>
        <TabsContent value="shifts" className="space-y-4">
          <ShiftClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}
