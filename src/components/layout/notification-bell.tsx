"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { relativeTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/queries/notifications";

export function NotificationBell({ notifications, unreadCount }: { notifications: Notification[]; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 90_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        nativeButton={false}
        render={
          <Button variant="ghost" size="icon" className={cn("relative", unreadCount > 0 && "notif-bell-blink")}>
            <Bell className={cn("size-5", unreadCount > 0 && "text-primary")} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsRead();
                })
              }
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.link ?? "#"}
                    onClick={() => {
                      setOpen(false);
                      if (!notification.read) {
                        startTransition(async () => {
                          await markNotificationRead(notification.id);
                        });
                      }
                    }}
                    className="block px-4 py-3 hover:bg-muted/60"
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                      <div className={notification.read ? "pl-3.5" : ""}>
                        <p className="text-sm font-medium leading-snug">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(notification.created_at)}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
