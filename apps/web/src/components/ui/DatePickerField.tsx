import { useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "./calendar";
import { FeatureAnchoredPopover } from "./FeaturePopover";
import { cn } from "@/lib/utils";

export function DatePickerField({
  align = "left",
  disabled,
  label,
  maxDate,
  minDate,
  onChange,
  value,
}: {
  align?: "left" | "right";
  disabled?: ((date: Date) => boolean) | undefined;
  label: string;
  maxDate?: Date | null | undefined;
  minDate?: Date | null | undefined;
  onChange: (date: Date) => void;
  value: Date | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isDateDisabled = (date: Date) => {
    if (minDate && date < startOfDay(minDate)) return true;
    if (maxDate && date > startOfDay(maxDate)) return true;
    return disabled?.(date) ?? false;
  };

  return (
    <div className="inline-block" ref={rootRef}>
      <button
        ref={triggerRef}
        className={cn(
          "datepicker-field-trigger group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card/60 hover:bg-card border border-border/50 hover:border-accent/40 text-foreground transition-all duration-200 cursor-pointer shadow-sm hover:shadow active:scale-[0.98] select-none touch-target",
        )}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <CalendarDays className="size-4 text-accent/60 shrink-0 group-hover:text-accent transition-colors duration-200" />
        <span className="datepicker-field-label text-xs text-muted font-medium">
          {label}:
        </span>
        <span className="font-bold text-xs text-foreground tracking-wide">
          {formatDate(value)}
        </span>
      </button>

      <FeatureAnchoredPopover
        align={align === "right" ? "end" : "start"}
        anchorRef={rootRef}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="p-1 bg-panel border border-line rounded-2xl shadow-[var(--shadow-panel)] overflow-hidden"
        maxHeight={400}
      >
        <Calendar
          disabled={isDateDisabled}
          mode="single"
          onSelect={(date) => {
            if (!date) return;
            onChange(date);
            setIsOpen(false);
          }}
          selected={value ?? undefined}
        />
      </FeatureAnchoredPopover>
    </div>
  );
}

export function formatDate(value: Date | null) {
  if (!value) return "DD/MM/AAAA";
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  return `${day}/${month}/${year}`;
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}
