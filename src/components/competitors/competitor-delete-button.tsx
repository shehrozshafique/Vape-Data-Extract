"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteCompetitor } from "@/lib/actions/competitors";

export function CompetitorDeleteButton({
  competitorId,
  competitorName,
}: {
  competitorId: string;
  competitorName: string;
}) {
  return (
    <ConfirmDeleteButton
      label="Delete"
      title={`Delete ${competitorName}?`}
      description="This permanently deletes the competitor, its products, scan history, and tasks. This cannot be undone."
      confirmLabel="Delete competitor"
      onConfirm={() => deleteCompetitor(competitorId)}
    />
  );
}
