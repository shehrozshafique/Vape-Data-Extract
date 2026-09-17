"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCompetitor, updateCompetitor } from "@/lib/actions/competitors";
import { DEFAULT_SCAN_FREQUENCY_MINUTES, SCAN_FREQUENCY_OPTIONS } from "@/lib/constants";
import type { Competitor } from "@/lib/queries/competitors";
import type { Project } from "@/lib/queries/projects";
import { Loader2, Plus } from "lucide-react";

export function CompetitorFormDialog({
  mode,
  competitor,
  disabled,
  projects,
  defaultProjectId,
}: {
  mode: "create" | "edit";
  competitor?: Competitor;
  disabled?: boolean;
  projects: Project[];
  defaultProjectId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = mode === "create" ? await createCompetitor(formData) : await updateCompetitor(competitor!.id, formData);
      if (result.success) {
        toast.success(mode === "create" ? "Competitor added — running the initial baseline scan now." : "Competitor updated.");
        if (mode === "create") formRef.current?.reset();
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton={false}
        render={
          mode === "create" ? (
            <Button disabled={disabled}>
              <Plus className="size-4" />
              Add Competitor
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              Edit
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Competitor" : `Edit ${competitor?.name}`}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "The first scan establishes a baseline of existing products without flooding the team with tasks. Scans run once per day."
              : "Update this competitor's monitoring configuration."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="project_id">Client project</Label>
              <Select name="project_id" defaultValue={competitor?.project_id ?? defaultProjectId ?? projects[0]?.id}>
                <SelectTrigger id="project_id" className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Competitor name</Label>
              <Input id="name" name="name" defaultValue={competitor?.name} required placeholder="Competitor Store" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website_url">Website</Label>
              <Input id="website_url" name="website_url" type="url" defaultValue={competitor?.website_url} required placeholder="https://example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input id="logo_url" name="logo_url" type="url" defaultValue={competitor?.logo_url ?? ""} placeholder="https://example.com/logo.png" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sitemap_url">Main sitemap URL</Label>
              <Input id="sitemap_url" name="sitemap_url" type="url" defaultValue={competitor?.sitemap_url} required placeholder="https://example.com/sitemap.xml" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product_sitemap_url">Product sitemap URL (optional)</Label>
              <Input
                id="product_sitemap_url"
                name="product_sitemap_url"
                type="url"
                defaultValue={competitor?.product_sitemap_url ?? ""}
                placeholder="https://example.com/product-sitemap.xml"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sitemap_type">Sitemap type</Label>
              <Select name="sitemap_type" defaultValue={competitor?.sitemap_type ?? "auto"}>
                <SelectTrigger id="sitemap_type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="urlset">Plain sitemap (urlset)</SelectItem>
                  <SelectItem value="sitemap_index">Sitemap index</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scan_frequency_minutes">Scan frequency</Label>
              <Select
                name="scan_frequency_minutes"
                defaultValue={String(competitor?.scan_frequency_minutes ?? DEFAULT_SCAN_FREQUENCY_MINUTES)}
              >
                <SelectTrigger id="scan_frequency_minutes" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCAN_FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.minutes} value={String(opt.minutes)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={competitor?.status ?? "active"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="include_patterns">Include URL patterns (one per line)</Label>
              <Textarea
                id="include_patterns"
                name="include_patterns"
                rows={3}
                defaultValue={competitor?.include_patterns?.join("\n")}
                placeholder={"/products/\n/product/"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exclude_patterns">Exclude URL patterns (one per line)</Label>
              <Textarea
                id="exclude_patterns"
                name="exclude_patterns"
                rows={3}
                defaultValue={competitor?.exclude_patterns?.join("\n")}
                placeholder={"/collections/\n/blogs/\n/pages/"}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} defaultValue={competitor?.notes ?? ""} />
            </div>

            {mode === "create" && (
              <div className="col-span-2 flex items-start gap-2 rounded-md border bg-muted/30 p-3">
                <Checkbox id="baseline_import_as_tasks" name="baseline_import_as_tasks" />
                <Label htmlFor="baseline_import_as_tasks" className="text-xs font-normal leading-snug text-muted-foreground">
                  Import existing products as tasks. By default the first scan only saves a baseline — enable this only if you want every
                  existing product to also create a To Do task.
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Add Competitor" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
