"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteResult = { success: true } | { success: false; error: string };

export function ConfirmDeleteButton({
  label = "Delete",
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  redirectTo,
  variant = "outline",
  size = "sm",
  disabled,
}: {
  label?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<DeleteResult>;
  redirectTo?: string;
  variant?: "outline" | "destructive" | "ghost";
  size?: "sm" | "default" | "icon-sm";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton={false}
        render={
          <Button variant={variant} size={size} disabled={disabled} className={variant === "destructive" ? undefined : "text-destructive hover:text-destructive"}>
            <Trash2 className="size-3.5" />
            {size === "icon-sm" ? <span className="sr-only">{label}</span> : label}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await onConfirm();
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Deleted successfully.");
                setOpen(false);
                if (redirectTo) router.push(redirectTo);
                else router.refresh();
              })
            }
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
