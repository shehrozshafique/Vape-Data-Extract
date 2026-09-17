import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/product-image";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { ActivityBarChart } from "@/components/dashboard/activity-bar-chart";
import { LatestProducts } from "@/components/dashboard/latest-products";
import { ScanHistoryTable } from "@/components/competitors/scan-history-table";
import { ScanNowButton } from "@/components/competitors/scan-now-button";
import { CompetitorFormDialog } from "@/components/competitors/competitor-form-dialog";
import { getCompetitorById, getCompetitorTotalProducts, getScanHistory } from "@/lib/queries/competitors";
import { getDashboardKpis, getLatestProducts } from "@/lib/queries/dashboard";
import { getActivityChartData } from "@/lib/queries/activity-chart";
import { getActivityReport } from "@/lib/queries/reports";
import { getProjects } from "@/lib/queries/projects";
import { getCurrentProfile, getUserPermissions, hasRole } from "@/lib/auth";
import { getDateRangeForPreset, getLastNDaysRange, relativeTime, formatDateTime } from "@/lib/utils/dates";
import { PackageSearch, Radar } from "lucide-react";

export default async function CompetitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitor = await getCompetitorById(id);
  if (!competitor) notFound();

  const last30 = getDateRangeForPreset("last_30_days");
  const last12Weeks = getLastNDaysRange(84);

  const [kpis, totalProducts, dailyChart, weeklyReport, latestProducts, scans, profile, projects] = await Promise.all([
    getDashboardKpis(competitor.id),
    getCompetitorTotalProducts(competitor.id),
    getActivityChartData({ from: last30.from, to: last30.to, competitorIds: [competitor.id] }),
    getActivityReport({ from: last12Weeks.from, to: last12Weeks.to, grouping: "week", competitorId: competitor.id }),
    getLatestProducts(10, competitor.id),
    getScanHistory(competitor.id),
    getCurrentProfile(),
    getProjects(),
  ]);

  const permissions = profile ? await getUserPermissions(profile.id) : null;
  const canManage = Boolean(permissions?.can_manage_competitors || hasRole(profile, "manager"));

  return (
    <div className="space-y-6">
      <Link href="/competitors" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Competitors
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ProductImage src={competitor.logo_url} alt={competitor.name} size={56} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{competitor.name}</h1>
              <Badge variant="outline" className={competitor.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>
                {competitor.status === "active" ? "Active" : "Paused"}
              </Badge>
              {!competitor.baseline_completed_at && <Badge variant="outline">Baseline in progress</Badge>}
            </div>
            <a href={competitor.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
              {competitor.domain} <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ScanNowButton competitorId={competitor.id} />
          {canManage && (
            <CompetitorFormDialog mode="edit" competitor={competitor} projects={projects} defaultProjectId={competitor.project_id} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="New Today" value={kpis.newToday} icon={PackageSearch} accent="blue" />
        <KpiCard label="New This Week" value={kpis.newThisWeek} icon={PackageSearch} accent="blue" />
        <KpiCard label="New This Month" value={kpis.newThisMonth} icon={PackageSearch} accent="blue" />
        <KpiCard label="Total Products" value={totalProducts.toLocaleString()} icon={Radar} />
      </div>

      <Card className="shadow-none">
        <CardContent className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Sitemap</p>
            <a href={competitor.sitemap_url} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
              {competitor.sitemap_url}
            </a>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last scan</p>
            <p>{relativeTime(competitor.last_scan_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Next scan</p>
            <p>{competitor.next_scan_at ? formatDateTime(competitor.next_scan_at) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Scan frequency</p>
            <p>Once daily</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Products Discovered Per Day (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart points={dailyChart.points} seriesNames={dailyChart.seriesNames} stableOrder={[competitor.name]} />
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Products Discovered Per Week (12 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityBarChart rows={weeklyReport.rows} competitorNames={weeklyReport.competitorNames} stableOrder={[competitor.name]} />
          </CardContent>
        </Card>
      </div>

      <LatestProducts products={latestProducts} />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Scan History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScanHistoryTable scans={scans} />
        </CardContent>
      </Card>
    </div>
  );
}
