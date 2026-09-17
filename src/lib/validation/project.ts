import { z } from "zod";

const urlField = z.string().trim().url("Enter a valid URL, including https://");

export const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Client / project name is required").max(200),
  website_url: urlField,
  logo_url: z.union([urlField, z.literal("")]).optional(),
  status: z.enum(["active", "paused"]).default("active"),
  notes: z.string().trim().max(2000).optional(),
});

export type ProjectFormInput = z.input<typeof projectFormSchema>;
