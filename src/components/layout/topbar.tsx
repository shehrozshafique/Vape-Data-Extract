import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { getNotifications, getUnreadNotificationCount } from "@/lib/queries/notifications";
import { APP_NAME } from "@/lib/constants";
import type { Profile } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "All Projects" },
  { href: "/tasks", label: "Products / Tasks" },
  { href: "/competitors", label: "Competitors" },
  { href: "/activity", label: "Activity" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export async function Topbar({
  profile,
  title,
  showAdmin,
}: {
  profile: Profile;
  title?: string;
  showAdmin?: boolean;
}) {
  const [notifications, unreadCount] = await Promise.all([getNotifications(), getUnreadNotificationCount()]);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 md:px-6">
      <Sheet>
        <SheetTrigger
          nativeButton={false}
          render={
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="border-b px-5 py-4 text-sm font-semibold">{APP_NAME}</SheetTitle>
          <nav className="space-y-0.5 p-3">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                {item.label}
              </Link>
            ))}
            {showAdmin && (
              <Link href="/admin" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                Admin Panel
              </Link>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      <h1 className="flex-1 truncate text-sm font-semibold text-foreground md:text-base">{title ?? APP_NAME}</h1>

      <ThemeToggle />
      <NotificationBell notifications={notifications} unreadCount={unreadCount} />
      <UserMenu name={profile.name} email={profile.email} role={profile.role} />
    </header>
  );
}
