"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { relativeTime } from "@/lib/utils/dates";
import { updateTaskStatus, assignTask, addTaskNote, rescanProduct, updateTaskPriority } from "@/lib/actions/tasks";
import type { TaskDetail } from "@/lib/queries/tasks";
import type { TaskStatus } from "@/lib/queries/task-statuses";
import type { Profile } from "@/lib/auth";
import { Loader2, RefreshCw } from "lucide-react";

export function TaskWorkflowCard({
  task,
  statuses,
  profiles,
  canEdit,
}: {
  task: TaskDetail;
  statuses: TaskStatus[];
  profiles: Profile[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Internal Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            {canEdit ? (
              <Select
                defaultValue={task.status?.id}
                disabled={isPending}
                onValueChange={(v) => {
                  if (!v) return;
                  startTransition(async () => {
                    const result = await updateTaskStatus(task.id, v);
                    if (!result.success) toast.error(result.error);
                  });
                }}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              task.status && <StatusBadge label={task.status.label} color={task.status.color} />
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Assigned to</p>
            {canEdit ? (
              <Select
                defaultValue={task.assignee?.id ?? "unassigned"}
                disabled={isPending}
                onValueChange={(v) =>
                  startTransition(async () => {
                    const result = await assignTask(task.id, v === "unassigned" ? null : v);
                    if (!result.success) toast.error(result.error);
                  })
                }
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name ?? p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm">{task.assignee?.name ?? task.assignee?.email ?? "Unassigned"}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Priority</p>
            {canEdit ? (
              <Select
                defaultValue={task.priority}
                disabled={isPending}
                onValueChange={(v) => {
                  if (!v) return;
                  startTransition(async () => {
                    const result = await updateTaskPriority(task.id, v as "low" | "normal" | "high" | "urgent");
                    if (!result.success) toast.error(result.error);
                  });
                }}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm capitalize">{task.priority}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Last updated</p>
            <p className="text-sm">{relativeTime(task.updatedAt)}</p>
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await rescanProduct(task.product.id);
                  if (result.success) toast.success("Product re-scanned.");
                  else toast.error(result.error);
                })
              }
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Re-scan product
            </Button>
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground">Notes</p>
          {task.taskNotes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
          <ul className="space-y-2">
            {task.taskNotes.map((n) => (
              <li key={n.id} className="rounded-md bg-muted/40 p-2.5 text-sm">
                <p>{n.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {n.author?.name ?? n.author?.email ?? "Unknown"} · {relativeTime(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
          {canEdit && (
            <div className="flex items-start gap-2 pt-1">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" rows={2} className="flex-1" />
              <Button
                size="sm"
                disabled={isPending || !note.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const result = await addTaskNote(task.id, note);
                    if (result.success) setNote("");
                    else toast.error(result.error);
                  })
                }
              >
                Add
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground">Status History</p>
          {task.history.length === 0 && <p className="text-sm text-muted-foreground">No status changes yet.</p>}
          <ul className="space-y-2 text-sm">
            {task.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {h.oldStatus?.label ?? "—"} → <span className="font-medium text-foreground">{h.newStatus?.label ?? "—"}</span> by{" "}
                  {h.changedBy?.name ?? h.changedBy?.email ?? "system"}
                </span>
                <span className="whitespace-nowrap text-xs text-muted-foreground">{relativeTime(h.changedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
