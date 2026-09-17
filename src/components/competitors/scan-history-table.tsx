import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/dates";
import type { SitemapScan } from "@/lib/queries/competitors";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial_error: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  running: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-gray-100 text-gray-600 border-gray-200",
};

export function ScanHistoryTable({ scans, showCompetitor = false }: { scans: (SitemapScan & { competitor?: { id: string; name: string } | null })[]; showCompetitor?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {showCompetitor && <TableHead>Competitor</TableHead>}
            <TableHead>Started</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">URLs Scanned</TableHead>
            <TableHead className="text-right">New</TableHead>
            <TableHead className="text-right">Existing</TableHead>
            <TableHead className="text-right">Missing</TableHead>
            <TableHead className="text-right">Errors</TableHead>
            <TableHead className="text-right">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans.length === 0 && (
            <TableRow>
              <TableCell colSpan={showCompetitor ? 9 : 8} className="h-24 text-center text-sm text-muted-foreground">
                No scans yet.
              </TableCell>
            </TableRow>
          )}
          {scans.map((scan) => (
            <TableRow key={scan.id}>
              {showCompetitor && <TableCell className="font-medium">{scan.competitor?.name ?? "—"}</TableCell>}
              <TableCell className="text-sm text-muted-foreground">{formatDateTime(scan.started_at)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_STYLES[scan.status] ?? ""}>
                  {scan.is_baseline ? "Baseline" : scan.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{scan.total_urls.toLocaleString()}</TableCell>
              <TableCell className="text-right tabular-nums text-emerald-600">{scan.new_urls}</TableCell>
              <TableCell className="text-right tabular-nums">{scan.existing_urls}</TableCell>
              <TableCell className="text-right tabular-nums">{scan.missing_urls}</TableCell>
              <TableCell className="text-right tabular-nums">{scan.error_count > 0 ? <span className="text-red-600">{scan.error_count}</span> : 0}</TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">{scan.duration_ms ? `${(scan.duration_ms / 1000).toFixed(1)}s` : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
