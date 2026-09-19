"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/shared/status-badge";
import { createTaskStatus, updateTaskStatusDefinition, setDefaultTaskStatus } from "@/lib/actions/settings";
import { STATUS_COLOR_CLASSES } from "@/lib/constants";
import type { TaskStatus } from "@/lib/queries/task-statuses";
import { Plus } from "lucide-react";

const COLORS = Object.keys(STATUS_COLOR_CLASSES);
const COLOR_ITEMS = Object.fromEntries(
  COLORS.map((color) => [color, color.charAt(0).toUpperCase() + color.slice(1)]),
);

function StatusRow({ status }: { status: TaskStatus }) {
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState(status.label);
  const [color, setColor] = useState(status.color);
  const [isTerminal, setIsTerminal] = useState(status.is_terminal);

  function save() {
    startTransition(async () => {
      const result = await updateTaskStatusDefinition(status.id, { label, color, is_terminal: isTerminal });
      if (result.success) toast.success("Status updated.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
      <StatusBadge label={status.label} color={status.color} className="mr-2" />
      <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 w-40" />
      <Select value={color} items={COLOR_ITEMS} onValueChange={(v) => v && setColor(v)}>
        <SelectTrigger className="h-8 w-28" aria-label="Status color">
          <SelectValue placeholder="Color" />
        </SelectTrigger>
        <SelectContent>
          {COLORS.map((c) => (
            <SelectItem key={c} value={c} label={COLOR_ITEMS[c]}>
              {COLOR_ITEMS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Checkbox checked={isTerminal} onCheckedChange={(v) => setIsTerminal(Boolean(v))} />
        Terminal
      </label>
      {status.is_default && <span className="text-xs text-muted-foreground">Default for new products</span>}
      {!status.is_default && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await setDefaultTaskStatus(status.id);
              if (!result.success) toast.error(result.error);
            })
          }
        >
          Make default
        </Button>
      )}
      <Button size="sm" className="ml-auto h-8" disabled={isPending} onClick={save}>
        Save
      </Button>
    </div>
  );
}

export function TaskStatusManager({ statuses }: { statuses: TaskStatus[] }) {
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("blue");

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Task Statuses</CardTitle>
        <CardDescription>Rename existing statuses or add new ones for your team&apos;s workflow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {statuses.map((status) => (
          <StatusRow key={status.id} status={status} />
        ))}

        <div className="flex flex-wrap items-end gap-2 border-t pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-status-label" className="text-xs">New status label</Label>
            <Input id="new-status-label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="h-8 w-48" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <Select value={newColor} items={COLOR_ITEMS} onValueChange={(v) => v && setNewColor(v)}>
              <SelectTrigger className="h-8 w-28" aria-label="New status color">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                {COLORS.map((c) => (
                  <SelectItem key={c} value={c} label={COLOR_ITEMS[c]}>
                    {COLOR_ITEMS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            disabled={isPending || !newLabel.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await createTaskStatus({ key: newLabel, label: newLabel, color: newColor });
                if (result.success) setNewLabel("");
                else toast.error(result.error);
              })
            }
          >
            <Plus className="size-3.5" /> Add Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
