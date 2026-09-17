"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { triggerManualScan } from "@/lib/actions/competitors";
import { RefreshCw, Loader2 } from "lucide-react";

export function ScanNowButton({ competitorId, size = "sm" }: { competitorId: string; size?: "sm" | "default" }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size={size}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await triggerManualScan(competitorId);
          if (result.success) toast.success("Scan complete.");
          else toast.error(result.error);
        })
      }
    >
      {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
      Scan Now
    </Button>
  );
}
