"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { Competitor } from "@/lib/queries/competitors";
import type { TaskStatus } from "@/lib/queries/task-statuses";
import type { Profile } from "@/lib/auth";

const DATE_PRESETS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest discovered" },
  { value: "oldest", label: "Oldest discovered" },
  { value: "competitor", label: "Competitor" },
  { value: "status", label: "Status" },
  { value: "name", label: "Product name" },
];

const ALL = "__all__";

export function TaskFilters({
  competitors,
  statuses,
  brands,
  profiles,
}: {
  competitors: Competitor[];
  statuses: TaskStatus[];
  brands: string[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== ALL) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [pathname, router, searchParams],
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setParam("search", search || null);
  }

  const hasFilters = Array.from(searchParams.keys()).some((k) => k !== "page");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, brand, URL…"
          className="h-9 w-56 pl-8"
        />
      </form>

      <Select defaultValue={searchParams.get("competitor") ?? ALL} onValueChange={(v) => setParam("competitor", v)}>
        <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Competitor" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All competitors</SelectItem>
          {competitors.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={searchParams.get("status") ?? ALL} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={searchParams.get("brand") ?? ALL} onValueChange={(v) => setParam("brand", v)}>
        <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Brand" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All brands</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b} value={b}>{b}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={searchParams.get("assignedTo") ?? ALL} onValueChange={(v) => setParam("assignedTo", v)}>
        <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Assigned to" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Everyone</SelectItem>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name ?? p.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={searchParams.get("datePreset") ?? "all"} onValueChange={(v) => setParam("datePreset", v)}>
        <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Date" /></SelectTrigger>
        <SelectContent>
          {DATE_PRESETS.map((d) => (
            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={searchParams.get("sort") ?? "newest"} onValueChange={(v) => setParam("sort", v)}>
        <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Sort" /></SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); router.push(pathname); }}>
          <X className="size-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}
