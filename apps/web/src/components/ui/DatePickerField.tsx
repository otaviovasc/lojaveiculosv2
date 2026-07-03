import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "./calendar";

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
  const isDateDisabled = (date: Date) => {
    if (minDate && date < startOfDay(minDate)) return true;
    if (maxDate && date > startOfDay(maxDate)) return true;
    return disabled?.(date) ?? false;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        className="datepicker-field-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <CalendarDays className="size-4 text-muted shrink-0" />
        <span className="datepicker-field-label">{label}:</span>
        <span className="font-semibold text-sm">{formatDate(value)}</span>
      </button>

      {isOpen ? (
        <div
          className={`datepicker-popover ${align === "right" ? "right-0" : "left-0"}`}
        >
          <Calendar
            classNames={{
              day_button:
                "h-9 w-9 p-0 font-normal rounded-md transition-all hover:bg-primary hover:text-white text-xs flex items-center justify-center",
              weekday:
                "text-muted-foreground rounded-md w-9 font-black text-xs uppercase tracking-tighter text-center",
            }}
            disabled={isDateDisabled}
            mode="single"
            onSelect={(date) => {
              if (!date) return;
              onChange(date);
              setIsOpen(false);
            }}
            selected={value ?? undefined}
          />
        </div>
      ) : null}
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
