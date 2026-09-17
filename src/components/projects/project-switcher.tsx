"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setActiveProject } from "@/lib/actions/projects";
import type { Project } from "@/lib/queries/projects";

export function ProjectSwitcher({ projects, activeProjectId }: { projects: Project[]; activeProjectId: string | null }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (projects.length === 0) {
    return <p className="px-3 text-xs text-muted-foreground">No projects yet</p>;
  }

  return (
    <div className="px-3 pb-2">
      <p className="mb-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project</p>
      <Select
        value={activeProjectId ?? undefined}
        disabled={isPending}
        onValueChange={(value) => {
          if (!value) return;
          startTransition(async () => {
            await setActiveProject(value);
            router.refresh();
          });
        }}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
