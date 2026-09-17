import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PackagePlus, ScanLine, AlertTriangle, CheckCircle2 } from "lucide-react";
import { relativeTime } from "@/lib/utils/dates";
import type { ActivityFeedItem } from "@/lib/queries/activity-feed";
import { cn } from "@/lib/utils";

const ICONS: Record<ActivityFeedItem["kind"], typeof PackagePlus> = {
  scan: ScanLine,
  new_product: PackagePlus,
  status_change: CheckCircle2,
  scan_failed: AlertTriangle,
};

const ICON_COLORS: Record<ActivityFeedItem["kind"], string> = {
  scan: "text-blue-500",
  new_product: "text-emerald-500",
  status_change: "text-purple-500",
  scan_failed: "text-red-500",
};

export function ActivityFeedWidget({ items, title = "Today's Activity" }: { items: ActivityFeedItem[]; title?: string }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[360px] pr-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const Icon = ICONS[item.kind];
                const content = (
                  <div className="flex gap-3">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", ICON_COLORS[item.kind])} />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">{item.message}</p>
                      <p className="text-[11px] text-muted-foreground">{relativeTime(item.timestamp)}</p>
                    </div>
                  </div>
                );
                return <li key={item.id}>{item.link ? <Link href={item.link} className="block hover:opacity-80">{content}</Link> : content}</li>;
              })}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
