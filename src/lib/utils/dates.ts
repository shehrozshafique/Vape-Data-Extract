import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  startOfMonth,
  formatDistanceToNow,
  format,
} from "date-fns";

export interface DateRange {
  from: string;
  to: string;
}

export type DatePreset = "today" | "yesterday" | "last_7_days" | "last_30_days" | "last_90_days" | "this_week" | "this_month";

/** Day boundaries are computed in server-local time. Deployed on a single region this is
 * predictable; if that ever needs to be a fixed business timezone, compute with an explicit
 * offset here rather than scattering `new Date()` calls through the app. */
export function getDateRangeForPreset(preset: DatePreset, now: Date = new Date()): DateRange {
  switch (preset) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "yesterday": {
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday).toISOString(), to: endOfDay(yesterday).toISOString() };
    }
    case "last_7_days":
      return { from: startOfDay(subDays(now, 6)).toISOString(), to: endOfDay(now).toISOString() };
    case "last_30_days":
      return { from: startOfDay(subDays(now, 29)).toISOString(), to: endOfDay(now).toISOString() };
    case "last_90_days":
      return { from: startOfDay(subDays(now, 89)).toISOString(), to: endOfDay(now).toISOString() };
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), to: endOfDay(now).toISOString() };
    case "this_month":
      return { from: startOfMonth(now).toISOString(), to: endOfDay(now).toISOString() };
  }
}

export function dayBoundsFor(date: Date): DateRange {
  return { from: startOfDay(date).toISOString(), to: endOfDay(date).toISOString() };
}

export function getLastNDaysRange(days: number, now: Date = new Date()): DateRange {
  return { from: subDays(now, days).toISOString(), to: now.toISOString() };
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d MMM yyyy, HH:mm");
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d MMM yyyy");
}

export function isoDateKey(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}
