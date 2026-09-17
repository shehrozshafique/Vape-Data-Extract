"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { updateUserRole } from "@/lib/actions/settings";
import { ROLE_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/auth";
import type { UserRole } from "@/lib/supabase/database.types";

export function UserRoleManager({ profiles, currentUserId }: { profiles: Profile[]; currentUserId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Users &amp; Roles</CardTitle>
        <CardDescription>Super Admin, Manager, Team Member, or Viewer — controls what each teammate can do.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {profiles.map((profile) => (
          <div key={profile.id} className="flex items-center gap-3 rounded-md border p-3">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{(profile.name ?? profile.email).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile.name ?? "Unnamed"}</p>
              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
            </div>
            <Select
              defaultValue={profile.role}
              disabled={isPending || profile.id === currentUserId}
              onValueChange={(v) => {
                if (!v) return;
                startTransition(async () => {
                  const result = await updateUserRole(profile.id, v as UserRole);
                  if (!result.success) toast.error(result.error);
                });
              }}
            >
              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
