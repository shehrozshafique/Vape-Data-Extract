"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ListChecks,
  Building2,
  Activity,
  FileBarChart,
  Settings,
  FolderKanban,
  Shield,
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { ProjectSwitcher } from "@/components/projects/project-switcher";
import type { Project } from "@/lib/queries/projects";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "All Projects", icon: FolderKanban },
  { href: "/tasks", label: "Products / Tasks", icon: ListChecks },
  { href: "/competitors", label: "Competitors", icon: Building2 },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  projects,
  activeProjectId,
  showAdmin,
}: {
  projects: Project[];
  activeProjectId: string | null;
  showAdmin: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-background md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          P
        </div>
        <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
      </div>
      <div className="border-b py-3">
        <ProjectSwitcher projects={projects} activeProjectId={activeProjectId} />
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        {showAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Shield className="size-4" />
            Admin Panel
          </Link>
        )}
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">Once-daily competitor scans</div>
    </aside>
  );
}
