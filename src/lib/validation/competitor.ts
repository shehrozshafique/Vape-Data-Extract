import { z } from "zod";

const urlField = z.string().trim().url("Enter a valid URL, including https://");
const patternList = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );

export const competitorFormSchema = z.object({
  name: z.string().trim().min(1, "Competitor name is required").max(200),
  website_url: urlField,
  sitemap_url: urlField,
  product_sitemap_url: z.union([urlField, z.literal("")]).optional(),
  logo_url: z.union([urlField, z.literal("")]).optional(),
  sitemap_type: z.enum(["auto", "urlset", "sitemap_index"]).default("auto"),
  status: z.enum(["active", "paused"]).default("active"),
  scan_frequency_minutes: z.coerce.number().int().positive().default(1440),
  project_id: z.string().uuid("Select a project"),
  include_patterns: patternList,
  exclude_patterns: patternList,
  baseline_import_as_tasks: z.coerce.boolean().default(false),
  notes: z.string().trim().max(2000).optional(),
});

export type CompetitorFormInput = z.input<typeof competitorFormSchema>;
