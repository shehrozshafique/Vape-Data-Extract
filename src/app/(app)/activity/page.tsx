import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityControls } from "@/components/dashboard/activity-controls";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { ActivityFeedWidget } from "@/components/dashboard/activity-feed-widget";
import { ScanHistoryTable } from "@/components/competitors/scan-history-table";
import { getCompetitors, getAllScanHistory } from "@/lib/queries/competitors";
import { getActivityChartData } from "@/lib/queries/activity-chart";
import { getActivityFeed } from "@/lib/queries/activity-feed";
import { getActiveProject } from "@/lib/queries/projects";
import { getCurrentProfile, getAllowedProjectIds } from "@/lib/auth";
import { getDateRangeForPreset, type DatePreset } from "@/lib/utils/dates";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  const allowedIds = profile ? await getAllowedProjectIds(profile.id) : null;
  const activeProject = await getActiveProject(allowedIds);
  const projectId = activeProject?.id ?? null;

  const range = getDateRangeForPreset((sp.range as DatePreset) ?? "last_30_days");
  const competitors = await getCompetitors(projectId);
  const projectCompetitorIds = competitors.map((c) => c.id);
  const selectedIds = sp.competitors ? sp.competitors.split(",").filter(Boolean) : undefined;
  const competitorIds =
    selectedIds && selectedIds.length > 0
      ? selectedIds.filter((id) => projectCompetitorIds.includes(id))
      : projectCompetitorIds;
  const stableOrder = competitors.map((c) => c.name);

  const [chart, feed, scans] = await Promise.all([
    getActivityChartData({ from: range.from, to: range.to, competitorIds }),
    getActivityFeed(80, competitorIds),
    getAllScanHistory(50, projectId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground">
          {activeProject ? (
            <>
              Project <span className="font-medium text-foreground">{activeProject.name}</span> — publishing frequency by
              competitor.
            </>
          ) : (
            "Compare how frequently each competitor is publishing new products."
          )}
        </p>
      </div>

      <ActivityControls competitors={competitors.map((c) => ({ id: c.id, name: c.name }))} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="shadow-none xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Products Discovered Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart points={chart.points} seriesNames={chart.seriesNames} stableOrder={stableOrder} />
          </CardContent>
        </Card>
        <ActivityFeedWidget items={feed} title="Full Activity Feed" />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Recent Scans</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScanHistoryTable scans={scans} showCompetitor />
        </CardContent>
      </Card>
    </div>
  );
}
