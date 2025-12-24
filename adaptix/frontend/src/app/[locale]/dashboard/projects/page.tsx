import { ProjectClient } from "@/components/hrms/projects/project-client";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Project Management
        </h2>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950 p-6">
        <ProjectClient />
      </div>
    </div>
  );
}
