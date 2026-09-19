"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { triggerProjectScan } from "@/lib/actions/competitors";
import { RefreshCw, Loader2 } from "lucide-react";

export function ScanProjectNowButton({
  projectId,
  competitorCount,
  disabled,
}: {
  projectId: string;
  competitorCount: number;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="default"
      disabled={disabled || isPending || competitorCount === 0}
      onClick={() =>
        startTransition(async () => {
          const toastId = toast.loading(
            `Scanning ${competitorCount} competitor${competitorCount === 1 ? "" : "s"}…`,
          );
          const result = await triggerProjectScan(projectId);
          if (!result.success) {
            toast.error(result.error, { id: toastId });
            return;
          }

          const withFinds = result.details.filter((d) => d.newProducts > 0);
          if (result.newProducts > 0) {
            const names = withFinds.map((d) => `${d.name} (${d.newProducts})`).join(", ");
            toast.success(
              `Found ${result.newProducts} new product${result.newProducts === 1 ? "" : "s"} across ${withFinds.length} competitor${withFinds.length === 1 ? "" : "s"}.`,
              { id: toastId, description: names },
            );
          } else {
            toast.success(
              `Scan complete. No new products found across ${result.scanned} competitor${result.scanned === 1 ? "" : "s"}.`,
              {
                id: toastId,
                description:
                  result.skipped > 0
                    ? `${result.skipped} competitor${result.skipped === 1 ? " was" : "s were"} skipped.`
                    : undefined,
              },
            );
          }
        })
      }
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
      Scan Now
    </Button>
  );
}
