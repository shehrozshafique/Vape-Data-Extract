export const MAX_COMPETITORS = Number(process.env.MAX_COMPETITORS ?? 10);

/** Temporary local-dev bypass — skips login and uses the service-role client for data access.
 * Set DISABLE_AUTH=false (or remove it) when you want real Supabase auth again. */
export const AUTH_DISABLED = process.env.DISABLE_AUTH !== "false";

/** Consecutive scans a product must be absent from the sitemap before it's flagged
 * "Possibly Removed" — protects against a temporary sitemap glitch reading as a real removal. */
export const POSSIBLY_REMOVED_THRESHOLD = 3;

export const APP_NAME = "PSEO Data Extract";

export const SCAN_FREQUENCY_OPTIONS = [
  { label: "Once daily", minutes: 1440 },
] as const;

export const DEFAULT_SCAN_FREQUENCY_MINUTES = 1440;

export const ACTIVE_PROJECT_COOKIE = "active_project_id";

export const WORKFLOW_PERMISSION_LABELS = {
  can_scan: "Run scans",
  can_edit_tasks: "Edit tasks",
  can_manage_competitors: "Manage competitors",
  can_export: "Export reports",
  can_manage_users: "Manage users",
} as const;

/** Badge color token (stored on task_statuses.color) -> Tailwind classes. Extend this map if
 * an admin creates a status with a new color; unknown tokens fall back to `gray`. */
export const STATUS_COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  gray: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20",
  purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
};

export const AVAILABILITY_LABELS: Record<string, string> = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  preorder: "Pre-order",
  discontinued: "Discontinued",
  unknown: "Unknown",
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  team_member: "Team Member",
  viewer: "Viewer",
};
