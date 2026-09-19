import Link from "next/link";
import { PackageSearch, Clock, Loader2, CheckCircle2, Radar, ListTodo } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CompetitorActivityTable } from "@/components/dashboard/competitor-activity-table";
import { LatestProducts } from "@/components/dashboard/latest-products";
import { ActivityFeedWidget } from "@/components/dashboard/activity-feed-widget";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { WelcomeOnboarding } from "@/components/dashboard/welcome-onboarding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCompetitors } from "@/lib/queries/competitors";
import { getDashboardKpis, getCompetitorActivityTable, getLatestProducts } from "@/lib/queries/dashboard";
import { getActivityFeed } from "@/lib/queries/activity-feed";
import { getActivityChartData } from "@/lib/queries/activity-chart";
import { getActiveProject, getProjects } from "@/lib/queries/projects";
import { getCurrentProfile, getAllowedProjectIds } from "@/lib/auth";
import { getDateRangeForPreset, type DatePreset } from "@/lib/utils/dates";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  const allowedIds = profile ? await getAllowedProjectIds(profile.id) : null;
  const projects = await getProjects();
  const visibleProjects =
    allowedIds === null ? projects : projects.filter((p) => allowedIds.includes(p.id));
  const activeProject = await getActiveProject(allowedIds, visibleProjects);

  if (visibleProjects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Add a client project to start monitoring competitors.</p>
        </div>
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-start gap-3 py-10">
            <p className="text-sm text-muted-foreground">No client projects yet.</p>
            <Button nativeButton={false} render={<Link href="/projects">Go to All Projects</Link>} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const projectId = activeProject?.id ?? null;
  const competitors = await getCompetitors(projectId);
  const competitorIds = competitors.map((c) => c.id);

  if (competitors.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Project: <span className="font-medium text-foreground">{activeProject?.name}</span>
          </p>
        </div>
        <WelcomeOnboarding />
      </div>
    );
  }

  const competitorId = sp.competitor && competitorIds.includes(sp.competitor) ? sp.competitor : undefined;
  const rangePreset = (sp.range as DatePreset) ?? "last_7_days";
  const range = getDateRangeForPreset(rangePreset);
  const stableOrder = competitors.map((c) => c.name);
  const chartTitle = rangePreset === "last_30_days" ? "Last 30 Days" : "Last 7 Days";

  const [kpis, activityRows, latestProducts, feed, chart] = await Promise.all([
    getDashboardKpis(competitorId, competitorIds),
    getCompetitorActivityTable(projectId),
    getLatestProducts(8, competitorId, competitorIds),
    getActivityFeed(15, competitorIds),
    getActivityChartData({
      from: range.from,
      to: range.to,
      competitorIds: competitorId ? [competitorId] : competitorIds,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Project: <span className="font-medium text-foreground">{activeProject?.name}</span> — competitor activity at a glance.
          </p>
        </div>
        <DashboardFilters competitors={competitors.map((c) => ({ id: c.id, name: c.name }))} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10">
        <KpiCard label="New Today" value={kpis.newToday} icon={PackageSearch} accent="blue" />
        <KpiCard label="New Yesterday" value={kpis.newYesterday} icon={Clock} />
        <KpiCard label="New This Week" value={kpis.newThisWeek} icon={PackageSearch} accent="blue" />
        <KpiCard label="New This Month" value={kpis.newThisMonth} icon={PackageSearch} accent="blue" />
        <KpiCard label="To-do" value={kpis.toDo} icon={ListTodo} accent="blue" />
        <KpiCard label="Pending" value={kpis.pending} icon={Clock} />
        <KpiCard label="Processing" value={kpis.processing} icon={Loader2} accent="amber" />
        <KpiCard label="Done" value={kpis.done} icon={CheckCircle2} accent="green" />
        <KpiCard label="Not Need" value={kpis.notNeed} icon={ListTodo} />
        <KpiCard label="Active Competitors" value={kpis.activeCompetitors} icon={Radar} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="shadow-none xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Competitor Product Activity — {chartTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart points={chart.points} seriesNames={chart.seriesNames} stableOrder={stableOrder} />
          </CardContent>
        </Card>
        <ActivityFeedWidget items={feed} />
      </div>

      <CompetitorActivityTable rows={activityRows} />

      <LatestProducts products={latestProducts} />
    </div>
  );
}
