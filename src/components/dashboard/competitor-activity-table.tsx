import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CompetitorActivityRow } from "@/lib/queries/dashboard";
import { relativeTime } from "@/lib/utils/dates";

export function CompetitorActivityTable({ rows }: { rows: CompetitorActivityRow[] }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Competitor Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead className="text-right">Today</TableHead>
                <TableHead className="text-right">Yesterday</TableHead>
                <TableHead className="text-right">7 Days</TableHead>
                <TableHead className="text-right">30 Days</TableHead>
                <TableHead className="text-right">Total Products</TableHead>
                <TableHead>Last Scan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                    No competitors configured yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`/competitors/${row.id}`} className="flex items-center gap-2 hover:underline">
                      {row.name}
                      {row.status === "paused" && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Paused
                        </Badge>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.today}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.yesterday}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.last7Days}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.last30Days}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{row.totalProducts.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{relativeTime(row.lastScanAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
