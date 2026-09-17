"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setCompetitorStatus } from "@/lib/actions/competitors";

export function CompetitorStatusToggle({ competitorId, active }: { competitorId: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={active}
        disabled={isPending}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            const result = await setCompetitorStatus(competitorId, checked ? "active" : "paused");
            if (!result.success) toast.error(result.error);
          })
        }
      />
      <span className="text-xs text-muted-foreground">{active ? "Active" : "Paused"}</span>
    </div>
  );
}
