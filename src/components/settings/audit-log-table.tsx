import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils/dates";
import type { AuditLogRow } from "@/lib/queries/audit";

export function AuditLogTable({ entries }: { entries: AuditLogRow[] }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Audit Log</CardTitle>
        <CardDescription>Who changed what, across competitors, tasks, and users.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">No activity recorded yet.</TableCell>
                </TableRow>
              )}
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell className="text-sm">{entry.user?.name ?? entry.user?.email ?? "System"}</TableCell>
                  <TableCell className="text-sm font-mono text-xs">{entry.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.entityType}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
