// Hand-written to match supabase/migrations exactly. If the schema changes, update this file
// (or regenerate with `npx supabase gen types typescript` once the project is linked) in lockstep.

export type UserRole = "super_admin" | "manager" | "team_member" | "viewer";
export type CompetitorStatus = "active" | "paused";
export type ProjectStatus = "active" | "paused";
export type SitemapType = "auto" | "urlset" | "sitemap_index";
export type ScanStatus = "pending" | "running" | "success" | "partial_error" | "failed";
export type ScanTrigger = "schedule" | "manual" | "initial";
export type ProductAvailability = "in_stock" | "out_of_stock" | "preorder" | "discontinued" | "unknown";
export type ExtractionStatus = "pending" | "success" | "partial" | "failed" | "skipped";
export type PrefilledOrRefillable = "prefilled" | "refillable" | "both";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type NotificationType =
  | "new_products"
  | "scan_failed"
  | "sitemap_changed"
  | "product_unavailable"
  | "status_changed"
  | "system";
export type NotificationChannel = "in_app" | "slack" | "email" | "whatsapp";

export interface ExtractorConfig {
  titleSelector?: string;
  priceSelector?: string;
  imageSelector?: string;
  brandSelector?: string;
  availabilitySelector?: string;
  skuSelector?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; email: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          website_url: string;
          domain: string;
          logo_url: string | null;
          status: ProjectStatus;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & {
          name: string;
          website_url: string;
          domain: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
        Relationships: [];
      };
      user_permissions: {
        Row: {
          user_id: string;
          can_scan: boolean;
          can_edit_tasks: boolean;
          can_manage_competitors: boolean;
          can_export: boolean;
          can_manage_users: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_permissions"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["user_permissions"]["Row"]>;
        Relationships: [];
      };
      user_project_access: {
        Row: {
          user_id: string;
          project_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_project_access"]["Row"]> & {
          user_id: string;
          project_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_project_access"]["Row"]>;
        Relationships: [];
      };
      competitors: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          domain: string;
          website_url: string;
          logo_url: string | null;
          sitemap_url: string;
          product_sitemap_url: string | null;
          sitemap_type: SitemapType;
          include_patterns: string[];
          exclude_patterns: string[];
          extractor_config: ExtractorConfig;
          status: CompetitorStatus;
          scan_frequency_minutes: number;
          last_scan_at: string | null;
          next_scan_at: string | null;
          last_sitemap_hash: string | null;
          baseline_completed_at: string | null;
          baseline_import_as_tasks: boolean;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["competitors"]["Row"]> & {
          name: string;
          domain: string;
          website_url: string;
          sitemap_url: string;
          project_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["competitors"]["Row"]>;
        Relationships: [];
      };
      sitemap_scans: {
        Row: {
          id: string;
          competitor_id: string;
          started_at: string;
          completed_at: string | null;
          status: ScanStatus;
          is_baseline: boolean;
          total_urls: number;
          new_urls: number;
          existing_urls: number;
          missing_urls: number;
          error_count: number;
          error_message: string | null;
          sitemap_hash: string | null;
          http_status: number | null;
          duration_ms: number | null;
          triggered_by: ScanTrigger;
          triggered_by_user: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sitemap_scans"]["Row"]> & { competitor_id: string };
        Update: Partial<Database["public"]["Tables"]["sitemap_scans"]["Row"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          competitor_id: string;
          name: string | null;
          brand: string | null;
          product_url: string;
          normalized_url: string;
          canonical_url: string | null;
          image_url: string | null;
          price: number | null;
          sale_price: number | null;
          currency: string;
          availability: ProductAvailability;
          sku: string | null;
          description: string | null;
          meta_title: string | null;
          meta_description: string | null;
          discovery_source: string;
          sitemap_url: string | null;
          source_last_modified_at: string | null;
          published_at: string | null;
          first_seen_at: string;
          last_seen_at: string;
          is_baseline: boolean;
          missing_from_sitemap: boolean;
          first_missing_at: string | null;
          missing_scan_count: number;
          possibly_removed: boolean;
          content_hash: string | null;
          extraction_status: ExtractionStatus;
          extraction_error: string | null;
          last_extracted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & {
          competitor_id: string;
          product_url: string;
          normalized_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
        Relationships: [];
      };
      product_specs: {
        Row: {
          id: string;
          product_id: string;
          device_type: string | null;
          puff_count: number | null;
          battery_capacity: string | null;
          liquid_capacity: string | null;
          nicotine_strength: string | null;
          pod_type: string | null;
          prefilled_or_refillable: PrefilledOrRefillable | null;
          flavour_count: number | null;
          coil_type: string | null;
          wattage: string | null;
          charging_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["product_specs"]["Row"]> & { product_id: string };
        Update: Partial<Database["public"]["Tables"]["product_specs"]["Row"]>;
        Relationships: [];
      };
      task_statuses: {
        Row: {
          id: string;
          key: string;
          label: string;
          color: string;
          description: string | null;
          sort_order: number;
          is_default: boolean;
          is_terminal: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_statuses"]["Row"]> & { key: string; label: string; color: string };
        Update: Partial<Database["public"]["Tables"]["task_statuses"]["Row"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          product_id: string;
          status_id: string;
          assigned_to: string | null;
          priority: TaskPriority;
          notes: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & { product_id: string; status_id: string };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [];
      };
      task_history: {
        Row: {
          id: string;
          task_id: string;
          old_status_id: string | null;
          new_status_id: string;
          changed_by: string | null;
          changed_at: string;
          note: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["task_history"]["Row"]> & { task_id: string; new_status_id: string };
        Update: Partial<Database["public"]["Tables"]["task_history"]["Row"]>;
        Relationships: [];
      };
      task_notes: {
        Row: {
          id: string;
          task_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_notes"]["Row"]> & { task_id: string; body: string };
        Update: Partial<Database["public"]["Tables"]["task_notes"]["Row"]>;
        Relationships: [];
      };
      product_changes: {
        Row: {
          id: string;
          product_id: string;
          field_name: string;
          previous_value: string | null;
          new_value: string | null;
          detected_at: string;
          sitemap_scan_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["product_changes"]["Row"]> & { product_id: string; field_name: string };
        Update: Partial<Database["public"]["Tables"]["product_changes"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          type: NotificationType;
          channel: NotificationChannel;
          title: string;
          message: string;
          link: string | null;
          competitor_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & { type: NotificationType; title: string; message: string };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          previous_value: Record<string, unknown> | null;
          new_value: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_log"]["Row"]> & { action: string; entity_type: string };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_role_name: { Args: Record<string, never>; Returns: string };
      is_manager_or_above: { Args: Record<string, never>; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      is_team_member_or_above: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
  };
}
