import { redirect } from "next/navigation";
import { getCurrentProfile, getAllowedProjectIds, getUserPermissions, hasRole } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getActiveProject, getProjects } from "@/lib/queries/projects";

/** Dashboard data depends on cookies + Supabase — never statically prerender. */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let profile;
  try {
    profile = await getCurrentProfile();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown configuration error";
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-lg space-y-3 text-center">
          <h1 className="text-xl font-semibold">App configuration error</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">
            Confirm Supabase env vars are set in Vercel, then redeploy.
          </p>
        </div>
      </div>
    );
  }
  if (!profile) redirect("/login");

  const [allowedIds, permissions] = await Promise.all([
    getAllowedProjectIds(profile.id),
    getUserPermissions(profile.id),
  ]);

  const allProjects = await getProjects();
  const projects =
    allowedIds === null ? allProjects : allProjects.filter((p) => allowedIds.includes(p.id));
  const activeProject = await getActiveProject(allowedIds, projects);
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
