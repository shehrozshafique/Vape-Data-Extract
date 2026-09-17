"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductImage({ src, alt, className, size = 40 }: { src: string | null; alt: string; className?: string; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground", className)}
        style={{ width: size, height: size }}
      >
        <ImageOff className="size-4" />
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-md border bg-white", className)} style={{ width: size, height: size }}>
      {/* External, competitor-controlled URLs — unoptimized (see next.config.ts) so we never
          proxy arbitrary third-party hosts through Next's image optimizer. */}
      <Image src={src} alt={alt} fill sizes={`${size}px`} className="object-contain" unoptimized onError={() => setFailed(true)} />
    </div>
  );
}
