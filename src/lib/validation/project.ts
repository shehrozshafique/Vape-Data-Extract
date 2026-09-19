import { z } from "zod";

const urlField = z.string().trim().url("Enter a valid URL, including https://");

const competitorSitemapUrls = z
  .string()
  .optional()
  .transform((value) => {
    const lines = (value ?? "")
      .split(/[\n,]+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
      const key = line.toLowerCase().replace(/\/$/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(line);
    }
    return unique;
  })
  .pipe(z.array(urlField).max(50, "Add at most 50 competitor sitemap URLs"));

export const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Client / project name is required").max(200),
  website_url: urlField,
  logo_url: z.union([urlField, z.literal("")]).optional(),
  status: z.enum(["active", "paused"]).default("active"),
  notes: z.string().trim().max(2000).optional(),
  competitor_sitemap_urls: competitorSitemapUrls,
});

export type ProjectFormInput = z.input<typeof projectFormSchema>;
