"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DatePicker({ paramKey = "date" }: { paramKey?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentValue = searchParams.get(paramKey);
  const selected = currentValue ? new Date(currentValue) : new Date();

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramKey, format(date, "yyyy-MM-dd"));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-56 justify-start font-normal">
            <CalendarIcon className="size-4" />
            {format(selected, "d MMMM yyyy")}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selected} onSelect={handleSelect} disabled={{ after: new Date() }} autoFocus />
      </PopoverContent>
    </Popover>
  );
}
