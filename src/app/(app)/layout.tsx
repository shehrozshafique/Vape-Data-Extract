import { redirect } from "next/navigation";
import { getCurrentProfile, getAllowedProjectIds, getUserPermissions, hasRole } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getActiveProject, getProjects } from "@/lib/queries/projects";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [allowedIds, permissions] = await Promise.all([
    getAllowedProjectIds(profile.id),
    getUserPermissions(profile.id),
  ]);

  const allProjects = await getProjects();
  const projects =
    allowedIds === null ? allProjects : allProjects.filter((p) => allowedIds.includes(p.id));
  const activeProject = await getActiveProject(allowedIds);
  const showAdmin = hasRole(profile, "manager") || permissions.can_manage_users;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar projects={projects} activeProjectId={activeProject?.id ?? null} showAdmin={showAdmin} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar profile={profile} showAdmin={showAdmin} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
