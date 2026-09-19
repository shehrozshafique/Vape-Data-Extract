"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteProject } from "@/lib/actions/projects";

export function ProjectDeleteButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  return (
    <ConfirmDeleteButton
      label="Delete"
      title={`Delete ${projectName}?`}
      description="This permanently deletes the project, its competitors, products, and tasks. This cannot be undone."
      confirmLabel="Delete project"
      onConfirm={() => deleteProject(projectId)}
    />
  );
}
