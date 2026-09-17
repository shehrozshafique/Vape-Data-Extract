import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportControls } from "@/components/dashboard/report-controls";
import { ReportTable } from "@/components/dashboard/report-table";
import { ActivityBarChart } from "@/components/dashboard/activity-bar-chart";
import { DatePicker } from "@/components/shared/date-picker";
import { CompetitorCountBarChart } from "@/components/dashboard/competitor-count-bar-chart";
import { getActivityReport, type ReportGrouping } from "@/lib/queries/reports";
import { getDateCompetitorBreakdown } from "@/lib/queries/dashboard";
import { getCompetitors } from "@/lib/queries/competitors";
import { getActiveProject } from "@/lib/queries/projects";
import { getCurrentProfile, getAllowedProjectIds } from "@/lib/auth";
import { getDateRangeForPreset, type DatePreset } from "@/lib/utils/dates";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  const allowedIds = profile ? await getAllowedProjectIds(profile.id) : null;
  const activeProject = await getActiveProject(allowedIds);
  const projectId = activeProject?.id ?? null;

  const grouping = (sp.grouping as ReportGrouping) ?? "day";
  const range = getDateRangeForPreset((sp.range as DatePreset) ?? "last_30_days");
  const selectedDate = sp.date ? new Date(sp.date) : new Date();

  const competitors = await getCompetitors(projectId);
  const competitorIds = competitors.map((c) => c.id);

  const [report, breakdown] = await Promise.all([
    getActivityReport({ from: range.from, to: range.to, grouping, competitorIds }),
    getDateCompetitorBreakdown(selectedDate, projectId),
  ]);

  const stableOrder = competitors.map((c) => c.name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          {activeProject ? (
            <>
              Project <span className="font-medium text-foreground">{activeProject.name}</span> — daily, weekly, and monthly
              activity.
            </>
          ) : (
            "Daily, weekly, and monthly competitor publishing activity."
          )}
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Competitor Activity Report</CardTitle>
          <ReportControls />
        </CardHeader>
        <CardContent className="space-y-6">
          <ActivityBarChart rows={report.rows} competitorNames={report.competitorNames} stableOrder={stableOrder} />
          <ReportTable report={report} />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Date-Based Competitor Analysis</CardTitle>
          <DatePicker />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Products first seen on {selectedDate.toLocaleDateString()} — total {breakdown.total}.
          </p>
          <CompetitorCountBarChart rows={breakdown.rows} stableOrder={stableOrder} />
        </CardContent>
      </Card>
    </div>
  );
}
