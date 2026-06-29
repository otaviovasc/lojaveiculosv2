"use client";

import { DayPicker } from "@daypicker/react";
import { ptBR } from "@daypicker/react/locale";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-1", className)}
      locale={ptBR}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-1 sm:space-x-2 sm:space-y-0",
        month: "space-y-1",
        month_caption:
          "flex justify-center pt-0.5 relative items-center mb-0.5",
        caption_label:
          "text-[9px] font-black uppercase tracking-widest text-primary",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-0.5 h-5 w-5 bg-transparent p-0 opacity-50 hover:opacity-100 border-border/50 rounded-md transition-all",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-0.5 h-5 w-5 bg-transparent p-0 opacity-50 hover:opacity-100 border-border/50 rounded-md transition-all",
        ),
        month_grid: "w-full border-collapse space-y-0",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-6 font-black text-[8px] uppercase tracking-tighter",
        week: "flex w-full mt-0.5",
        day: cn(
          "relative p-0 text-center text-[10px] focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-primary/5 first:[&:has([aria-selected])]:rounded-l-sm last:[&:has([aria-selected])]:rounded-r-sm",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-sm [&:has(>.day-range-start)]:rounded-l-sm first:[&:has([aria-selected])]:rounded-l-sm last:[&:has([aria-selected])]:rounded-r-sm"
            : "[&:has([aria-selected])]:rounded-sm",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-6 w-6 p-0 font-normal rounded-sm transition-all hover:bg-primary hover:text-white text-[10px]",
        ),
        range_start:
          "day-range-start [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-bold [&>button]:rounded-l-sm",
        range_end:
          "day-range-end [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-bold [&>button]:rounded-r-sm",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary [&>button:hover]:text-primary-foreground [&>button:focus]:bg-primary [&>button:focus]:text-primary-foreground",
        today:
          "[&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:font-bold",
        outside: "[&>button]:text-muted-foreground/20 opacity-30",
        disabled: "[&>button]:text-muted-foreground opacity-30",
        range_middle: "[&>button]:bg-primary/10 [&>button]:text-primary",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation }) => {
          const iconClassName = cn("h-3 w-3", className);

          if (orientation === "left") {
            return <ChevronLeft aria-hidden="true" className={iconClassName} />;
          }

          if (orientation === "up") {
            return <ChevronUp aria-hidden="true" className={iconClassName} />;
          }

          if (orientation === "down") {
            return <ChevronDown aria-hidden="true" className={iconClassName} />;
          }

          return <ChevronRight aria-hidden="true" className={iconClassName} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
