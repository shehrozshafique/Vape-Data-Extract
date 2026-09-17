"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createProject, updateProject } from "@/lib/actions/projects";
import type { Project } from "@/lib/queries/projects";
import { Loader2, Plus } from "lucide-react";

export function ProjectFormDialog({ mode, project, disabled }: { mode: "create" | "edit"; project?: Project; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = mode === "create" ? await createProject(formData) : await updateProject(project!.id, formData);
      if (result.success) {
        toast.success(mode === "create" ? "Client project added." : "Project updated.");
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
              Add Project
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              Edit
            </Button>
          )
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Client Project" : `Edit ${project?.name}`}</DialogTitle>
          <DialogDescription>
            A project is a client website. Competitors you monitor for that client belong to this project.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Client / project name</Label>
            <Input id="name" name="name" defaultValue={project?.name} required placeholder="Acme Vapes" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website_url">Client website</Label>
            <Input id="website_url" name="website_url" type="url" defaultValue={project?.website_url} required placeholder="https://client.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input id="logo_url" name="logo_url" type="url" defaultValue={project?.logo_url ?? ""} placeholder="https://client.com/logo.png" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={project?.status ?? "active"}>
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={project?.notes ?? ""} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Create project" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
