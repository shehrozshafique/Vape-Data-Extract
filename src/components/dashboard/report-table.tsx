import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ActivityReport } from "@/lib/queries/reports";

export function ReportTable({ report }: { report: ActivityReport }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            {report.competitorNames.map((name) => (
              <TableHead key={name} className="text-right">{name}</TableHead>
            ))}
            <TableHead className="text-right font-semibold">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={report.competitorNames.length + 2} className="h-24 text-center text-sm text-muted-foreground">
                No products discovered in this range.
              </TableCell>
            </TableRow>
          )}
          {report.rows.map((row) => (
            <TableRow key={row.bucket}>
              <TableCell className="font-medium">{row.bucket}</TableCell>
              {report.competitorNames.map((name) => (
                <TableCell key={name} className="text-right tabular-nums">{row.competitorTotals[name] ?? 0}</TableCell>
              ))}
              <TableCell className="text-right font-semibold tabular-nums">{row.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        {report.rows.length > 0 && (
          <tfoot>
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              {report.competitorNames.map((name) => (
                <TableCell key={name} className="text-right font-semibold tabular-nums">
                  {report.rows.reduce((sum, row) => sum + (row.competitorTotals[name] ?? 0), 0)}
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold tabular-nums">{report.grandTotal}</TableCell>
            </TableRow>
          </tfoot>
        )}
      </Table>
    </div>
  );
}
