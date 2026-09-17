"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { ExternalLink } from "lucide-react";
import { bulkAssignTasks, bulkUpdateTaskStatus, updateTaskStatus } from "@/lib/actions/tasks";
import { formatDate, relativeTime } from "@/lib/utils/dates";
import type { TaskListRow } from "@/lib/queries/tasks";
import type { TaskStatus } from "@/lib/queries/task-statuses";
import type { Profile } from "@/lib/auth";

function formatPrice(price: number | null, currency: string) {
  if (price === null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(price);
}

export function TasksTable({
  rows,
  statuses,
  profiles,
  canEdit,
}: {
  rows: TaskListRow[];
  statuses: TaskStatus[];
  profiles: Profile[];
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulkStatus(statusId: string | null) {
    if (!statusId) return;
    startTransition(async () => {
      const result = await bulkUpdateTaskStatus(Array.from(selected), statusId);
      if (result.success) {
        toast.success(`Updated ${selected.size} task${selected.size === 1 ? "" : "s"}.`);
        setSelected(new Set());
      } else toast.error(result.error);
    });
  }

  function runBulkAssign(userId: string | null) {
    if (!userId) return;
    startTransition(async () => {
      const result = await bulkAssignTasks(Array.from(selected), userId === "unassigned" ? null : userId);
      if (result.success) {
        toast.success(`Assigned ${selected.size} task${selected.size === 1 ? "" : "s"}.`);
        setSelected(new Set());
      } else toast.error(result.error);
    });
  }

  function runRowStatusChange(taskId: string, statusId: string | null) {
    if (!statusId) return;
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, statusId);
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {canEdit && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Select onValueChange={runBulkStatus} disabled={isPending}>
            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Change status" /></SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={runBulkAssign} disabled={isPending}>
            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Assign to" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassign</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name ?? p.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border bg-background">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              {canEdit && (
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
              )}
              <TableHead className="w-14">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Competitor</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Discovered</TableHead>
              <TableHead>Sitemap Modified</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead className="w-10">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center text-sm text-muted-foreground">
                  No products match these filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
                {canEdit && (
                  <TableCell>
                    <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleOne(row.id)} />
                  </TableCell>
                )}
                <TableCell>
                  <ProductImage src={row.product.imageUrl} alt={row.product.name ?? "Product"} size={36} />
                </TableCell>
                <TableCell className="max-w-56">
                  <Link href={`/tasks/${row.id}`} className="line-clamp-2 text-sm font-medium hover:underline">
                    {row.product.name ?? "Untitled product"}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">{row.competitor.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.product.brand ?? "—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{formatPrice(row.product.price, row.product.currency)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{relativeTime(row.product.firstSeenAt)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.product.sourceLastModifiedAt)}</TableCell>
                <TableCell>
                  {canEdit ? (
                    <Select defaultValue={row.status?.id} onValueChange={(v) => runRowStatusChange(row.id, v)}>
                      <SelectTrigger className="h-8 w-32 border-none bg-transparent px-0 shadow-none">
                        <SelectValue>{row.status && <StatusBadge label={row.status.label} color={row.status.color} />}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    row.status && <StatusBadge label={row.status.label} color={row.status.color} />
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.assignee?.name ?? row.assignee?.email ?? "Unassigned"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    render={
                      <a href={row.product.productUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3.5" />
                      </a>
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
