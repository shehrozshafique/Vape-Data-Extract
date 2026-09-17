import { createClient } from "@/lib/supabase/server";
import type { Database, TaskPriority } from "@/lib/supabase/database.types";

export type TaskSort = "newest" | "oldest" | "competitor" | "status" | "name";

export interface TaskFilters {
  competitorId?: string;
  competitorIds?: string[];
  statusId?: string;
  brand?: string;
  assignedTo?: string;
  from?: string;
  to?: string;
  search?: string;
  sort?: TaskSort;
  page?: number;
  pageSize?: number;
}

export interface TaskListRow {
  id: string;
  priority: TaskPriority;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  status: { id: string; key: string; label: string; color: string } | null;
  assignee: { id: string; name: string | null; email: string } | null;
  product: {
    id: string;
    name: string | null;
    brand: string | null;
    productUrl: string;
    imageUrl: string | null;
    price: number | null;
    currency: string;
    availability: string;
    firstSeenAt: string;
    sourceLastModifiedAt: string | null;
  };
  competitor: { id: string; name: string };
}

export interface TaskListResult {
  rows: TaskListRow[];
  total: number;
  page: number;
  pageSize: number;
}

const SELECT = `
  id, priority, notes, created_at, completed_at, status_id,
  task_statuses ( id, key, label, color ),
  profiles!tasks_assigned_to_fkey ( id, name, email ),
  products!inner (
    id, name, brand, product_url, image_url, price, currency, availability, first_seen_at, source_last_modified_at, competitor_id,
    competitors ( id, name )
  )
`;

export async function getTasks(filters: TaskFilters): Promise<TaskListResult> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;

  let query = supabase.from("tasks").select(SELECT, { count: "exact" });

  if (filters.competitorId) query = query.eq("products.competitor_id", filters.competitorId);
  else if (filters.competitorIds && filters.competitorIds.length > 0) {
    query = query.in("products.competitor_id", filters.competitorIds);
  } else if (filters.competitorIds && filters.competitorIds.length === 0) {
    return { rows: [], total: 0, page, pageSize };
  }
  if (filters.statusId) query = query.eq("status_id", filters.statusId);
  if (filters.brand) query = query.eq("products.brand", filters.brand);
  if (filters.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
  if (filters.from) query = query.gte("products.first_seen_at", filters.from);
  if (filters.to) query = query.lte("products.first_seen_at", filters.to);
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(`name.ilike.${term},brand.ilike.${term},product_url.ilike.${term}`, { foreignTable: "products" });
  }

  switch (filters.sort) {
    case "oldest":
      query = query.order("first_seen_at", { foreignTable: "products", ascending: true });
      break;
    case "competitor":
      query = query.order("competitor_id", { foreignTable: "products", ascending: true });
      break;
    case "status":
      query = query.order("sort_order", { foreignTable: "task_statuses", ascending: true });
      break;
    case "name":
      query = query.order("name", { foreignTable: "products", ascending: true });
      break;
    case "newest":
    default:
      query = query.order("first_seen_at", { foreignTable: "products", ascending: false });
      break;
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error || !data) return { rows: [], total: 0, page, pageSize };

  const rows: TaskListRow[] = (data as unknown as RawTaskRow[])
    .filter((row) => row.products)
    .map((row) => ({
      id: row.id,
      priority: row.priority,
      notes: row.notes,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      status: row.task_statuses,
      assignee: row.profiles,
      product: {
        id: row.products!.id,
        name: row.products!.name,
        brand: row.products!.brand,
        productUrl: row.products!.product_url,
        imageUrl: row.products!.image_url,
        price: row.products!.price,
        currency: row.products!.currency,
        availability: row.products!.availability,
        firstSeenAt: row.products!.first_seen_at,
        sourceLastModifiedAt: row.products!.source_last_modified_at,
      },
      competitor: row.products!.competitors ?? { id: "", name: "Unknown" },
    }));

  return { rows, total: count ?? rows.length, page, pageSize };
}

interface RawTaskRow {
  id: string;
  priority: TaskPriority;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  status_id: string;
  task_statuses: { id: string; key: string; label: string; color: string } | null;
  profiles: { id: string; name: string | null; email: string } | null;
  products: {
    id: string;
    name: string | null;
    brand: string | null;
    product_url: string;
    image_url: string | null;
    price: number | null;
    currency: string;
    availability: string;
    first_seen_at: string;
    source_last_modified_at: string | null;
    competitor_id: string;
    competitors: { id: string; name: string } | null;
  } | null;
}

export type ProductSpecs = Database["public"]["Tables"]["product_specs"]["Row"];

export interface TaskDetail {
  id: string;
  priority: TaskPriority;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  status: { id: string; key: string; label: string; color: string } | null;
  assignee: { id: string; name: string | null; email: string } | null;
  product: Database["public"]["Tables"]["products"]["Row"] & { competitors: { id: string; name: string; website_url: string } | null };
  specs: ProductSpecs | null;
  history: {
    id: string;
    changedAt: string;
    note: string | null;
    oldStatus: { label: string; color: string } | null;
    newStatus: { label: string; color: string } | null;
    changedBy: { name: string | null; email: string } | null;
  }[];
  taskNotes: { id: string; body: string; createdAt: string; author: { name: string | null; email: string } | null }[];
}

export async function getTaskDetail(taskId: string): Promise<TaskDetail | null> {
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select(
      `id, priority, notes, created_at, updated_at, completed_at, status_id,
       task_statuses ( id, key, label, color ),
       profiles!tasks_assigned_to_fkey ( id, name, email ),
       products ( *, competitors ( id, name, website_url ) )`,
    )
    .eq("id", taskId)
    .single();

  if (!task) return null;

  const [{ data: specs }, { data: history }, { data: taskNotes }] = await Promise.all([
    supabase.from("product_specs").select("*").eq("product_id", (task as unknown as { products: { id: string } }).products.id).maybeSingle(),
    supabase
      .from("task_history")
      .select(
        `id, changed_at, note,
         old_status:task_statuses!task_history_old_status_id_fkey ( label, color ),
         new_status:task_statuses!task_history_new_status_id_fkey ( label, color ),
         profiles ( name, email )`,
      )
      .eq("task_id", taskId)
      .order("changed_at", { ascending: false }),
    supabase.from("task_notes").select("id, body, created_at, profiles(name, email)").eq("task_id", taskId).order("created_at", { ascending: false }),
  ]);

  const raw = task as unknown as {
    id: string;
    priority: TaskPriority;
    notes: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    task_statuses: { id: string; key: string; label: string; color: string } | null;
    profiles: { id: string; name: string | null; email: string } | null;
    products: TaskDetail["product"];
  };

  return {
    id: raw.id,
    priority: raw.priority,
    notes: raw.notes,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    completedAt: raw.completed_at,
    status: raw.task_statuses,
    assignee: raw.profiles,
    product: raw.products,
    specs: specs ?? null,
    history: (history ?? []).map((h) => {
      const entry = h as unknown as {
        id: string;
        changed_at: string;
        note: string | null;
        old_status: { label: string; color: string } | null;
        new_status: { label: string; color: string } | null;
        profiles: { name: string | null; email: string } | null;
      };
      return {
        id: entry.id,
        changedAt: entry.changed_at,
        note: entry.note,
        oldStatus: entry.old_status,
        newStatus: entry.new_status,
        changedBy: entry.profiles,
      };
    }),
    taskNotes: (taskNotes ?? []).map((n) => {
      const note = n as unknown as { id: string; body: string; created_at: string; profiles: { name: string | null; email: string } | null };
      return { id: note.id, body: note.body, createdAt: note.created_at, author: note.profiles };
    }),
  };
}

export async function getDistinctBrands(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("brand").not("brand", "is", null).limit(1000);
  const brands = new Set((data ?? []).map((r) => r.brand).filter(Boolean) as string[]);
  return Array.from(brands).sort();
}
