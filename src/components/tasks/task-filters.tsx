"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
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
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest discovered" },
  { value: "oldest", label: "Oldest discovered" },
  { value: "competitor", label: "Competitor" },
  { value: "status", label: "Status" },
  { value: "name", label: "Product name" },
] as const;

const ALL = "all";

function toItems(entries: { value: string; label: string }[]) {
  return Object.fromEntries(entries.map((entry) => [entry.value, entry.label]));
}

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

  const competitorItems = useMemo(
    () =>
      toItems([
        { value: ALL, label: "All competitors" },
        ...competitors.map((competitor) => ({ value: competitor.id, label: competitor.name })),
      ]),
    [competitors],
  );
  const statusItems = useMemo(
    () =>
      toItems([
        { value: ALL, label: "All statuses" },
        ...statuses.map((status) => ({ value: status.id, label: status.label })),
      ]),
    [statuses],
  );
  const brandItems = useMemo(
    () =>
      toItems([
        { value: ALL, label: "All brands" },
        ...brands.map((brand) => ({ value: brand, label: brand })),
      ]),
    [brands],
  );
  const assigneeItems = useMemo(
    () =>
      toItems([
        { value: ALL, label: "Everyone" },
        ...profiles.map((profile) => ({
          value: profile.id,
          label: profile.name?.trim() || profile.email,
        })),
      ]),
    [profiles],
  );
  const dateItems = useMemo(() => toItems([...DATE_PRESETS]), []);
  const sortItems = useMemo(() => toItems([...SORT_OPTIONS]), []);

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
    setParam("search", search.trim() || null);
  }

  const hasFilters = Array.from(searchParams.keys()).some((key) => key !== "page");

  const competitorValue = searchParams.get("competitor") ?? ALL;
  const statusValue = searchParams.get("status") ?? ALL;
  const brandValue = searchParams.get("brand") ?? ALL;
  const assignedValue = searchParams.get("assignedTo") ?? ALL;
  const dateValue = searchParams.get("datePreset") ?? "all";
  const sortValue = searchParams.get("sort") ?? "newest";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={handleSearchSubmit} className="relative min-w-[12rem] flex-1 sm:max-w-xs sm:flex-none">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, brand, URL…"
          className="h-9 w-full pl-8"
          aria-label="Search products"
        />
      </form>

      <Select value={competitorValue} items={competitorItems} onValueChange={(value) => setParam("competitor", value)}>
        <SelectTrigger className="h-9 min-w-[10.5rem]" aria-label="Filter by competitor">
          <SelectValue placeholder="All competitors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} label="All competitors">
            All competitors
          </SelectItem>
          {competitors.map((competitor) => (
            <SelectItem key={competitor.id} value={competitor.id} label={competitor.name}>
              {competitor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusValue} items={statusItems} onValueChange={(value) => setParam("status", value)}>
        <SelectTrigger className="h-9 min-w-[9.5rem]" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} label="All statuses">
            All statuses
          </SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status.id} value={status.id} label={status.label}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={brandValue} items={brandItems} onValueChange={(value) => setParam("brand", value)}>
        <SelectTrigger className="h-9 min-w-[9rem]" aria-label="Filter by brand">
          <SelectValue placeholder="All brands" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} label="All brands">
            All brands
          </SelectItem>
          {brands.map((brand) => (
            <SelectItem key={brand} value={brand} label={brand}>
              {brand}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={assignedValue} items={assigneeItems} onValueChange={(value) => setParam("assignedTo", value)}>
        <SelectTrigger className="h-9 min-w-[9rem]" aria-label="Filter by assignee">
          <SelectValue placeholder="Everyone" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} label="Everyone">
            Everyone
          </SelectItem>
          {profiles.map((profile) => {
            const label = profile.name?.trim() || profile.email;
            return (
              <SelectItem key={profile.id} value={profile.id} label={label}>
                {label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select value={dateValue} items={dateItems} onValueChange={(value) => setParam("datePreset", value)}>
        <SelectTrigger className="h-9 min-w-[9rem]" aria-label="Filter by discovery date">
          <SelectValue placeholder="All time" />
        </SelectTrigger>
        <SelectContent>
          {DATE_PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value} label={preset.label}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortValue} items={sortItems} onValueChange={(value) => setParam("sort", value)}>
        <SelectTrigger className="h-9 min-w-[11rem]" aria-label="Sort products">
          <SelectValue placeholder="Newest discovered" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} label={option.label}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => {
            setSearch("");
            router.push(pathname);
          }}
        >
          <X className="size-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
