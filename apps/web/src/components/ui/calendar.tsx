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

/* ── Month names in pt-BR ─────────────────────────────────────────── */
const MONTH_NAMES_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/* ── Custom Month/Year Caption ─────────────────────────────────────── */
function CalendarCaption({
  displayMonth,
  onMonthChange,
  startYear,
  endYear,
}: {
  displayMonth: Date;
  onMonthChange: (date: Date) => void;
  startYear: number;
  endYear: number;
}) {
  const [pickerView, setPickerView] = React.useState<"none" | "month" | "year">(
    "none",
  );
  const panelRef = React.useRef<HTMLDivElement>(null);

  const currentMonth = displayMonth.getMonth();
  const currentYear = displayMonth.getFullYear();

  React.useEffect(() => {
    if (pickerView === "none") return;
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) {
        setPickerView("none");
      }
    };
    document.addEventListener("pointerdown", onClick);
    return () => document.removeEventListener("pointerdown", onClick);
  }, [pickerView]);

  const handlePrevMonth = () => {
    const prev = new Date(currentYear, currentMonth - 1, 1);
    onMonthChange(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentYear, currentMonth + 1, 1);
    onMonthChange(next);
  };

  const selectMonth = (monthIndex: number) => {
    onMonthChange(new Date(currentYear, monthIndex, 1));
    setPickerView("none");
  };

  const selectYear = (year: number) => {
    onMonthChange(new Date(year, currentMonth, 1));
    setPickerView("none");
  };

  /* Build year page (show 12 years at a time centered on current) */
  const [yearPageOffset, setYearPageOffset] = React.useState(0);
  const YEARS_PER_PAGE = 12;
  const baseYear =
    currentYear -
    Math.floor(YEARS_PER_PAGE / 2) +
    yearPageOffset * YEARS_PER_PAGE;
  const pageYears = Array.from(
    { length: YEARS_PER_PAGE },
    (_, i) => baseYear + i,
  ).filter((y) => y >= startYear && y <= endYear);

  /* Reset year page when opening */
  React.useEffect(() => {
    if (pickerView === "year") setYearPageOffset(0);
  }, [pickerView]);

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Header row: ◀  [Month] [Year]  ▶ ── */}
      <div className="flex items-center justify-center gap-1.5 h-9 mb-2">
        {/* Prev arrow */}
        <button
          type="button"
          onClick={handlePrevMonth}
          className="calendar-nav-btn"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-3.5" />
        </button>

        {/* Month button */}
        <button
          type="button"
          onClick={() =>
            setPickerView((v) => (v === "month" ? "none" : "month"))
          }
          className={cn(
            "calendar-caption-btn",
            pickerView === "month" && "calendar-caption-btn--active",
          )}
        >
          <span>{MONTH_NAMES_SHORT[currentMonth]}</span>
          <ChevronDown
            className={cn(
              "size-3 transition-transform duration-200",
              pickerView === "month" && "rotate-180",
            )}
          />
        </button>

        {/* Year button */}
        <button
          type="button"
          onClick={() => setPickerView((v) => (v === "year" ? "none" : "year"))}
          className={cn(
            "calendar-caption-btn",
            pickerView === "year" && "calendar-caption-btn--active",
          )}
        >
          <span>{currentYear}</span>
          <ChevronDown
            className={cn(
              "size-3 transition-transform duration-200",
              pickerView === "year" && "rotate-180",
            )}
          />
        </button>

        {/* Next arrow */}
        <button
          type="button"
          onClick={handleNextMonth}
          className="calendar-nav-btn"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      {/* ── Month grid (4×3) ── */}
      {pickerView === "month" && (
        <div className="calendar-picker-panel animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="grid grid-cols-3 gap-1">
            {MONTH_NAMES_SHORT.map((name, i) => (
              <button
                key={name}
                type="button"
                onClick={() => selectMonth(i)}
                className={cn(
                  "calendar-picker-cell",
                  i === currentMonth && "calendar-picker-cell--selected",
                )}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Year grid (4×3 with paging) ── */}
      {pickerView === "year" && (
        <div className="calendar-picker-panel animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={() => setYearPageOffset((p) => p - 1)}
              disabled={baseYear <= startYear}
              className="calendar-nav-btn disabled:opacity-20"
            >
              <ChevronLeft className="size-3" />
            </button>
            <span className="text-xs font-bold text-muted uppercase tracking-widest">
              {pageYears[0]}–{pageYears[pageYears.length - 1]}
            </span>
            <button
              type="button"
              onClick={() => setYearPageOffset((p) => p + 1)}
              disabled={baseYear + YEARS_PER_PAGE > endYear}
              className="calendar-nav-btn disabled:opacity-20"
            >
              <ChevronRight className="size-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {pageYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => selectYear(year)}
                className={cn(
                  "calendar-picker-cell",
                  year === currentYear && "calendar-picker-cell--selected",
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Calendar wrapper ──────────────────────────────────────────────── */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const now = new Date();
  const startYear = props.startMonth?.getFullYear() ?? now.getFullYear() - 80;
  const endYear = props.endMonth?.getFullYear() ?? now.getFullYear() + 10;

  const [displayMonth, setDisplayMonth] = React.useState(
    () => props.defaultMonth ?? props.month ?? now,
  );

  /* Sync controlled month */
  React.useEffect(() => {
    if (props.month) setDisplayMonth(props.month);
  }, [props.month]);

  const handleMonthChange = (date: Date) => {
    setDisplayMonth(date);
    props.onMonthChange?.(date);
  };

  return (
    <div className={cn("calendar-root", className)}>
      <CalendarCaption
        displayMonth={displayMonth}
        onMonthChange={handleMonthChange}
        startYear={startYear}
        endYear={endYear}
      />
      <DayPicker
        showOutsideDays={showOutsideDays}
        className="calendar-grid"
        locale={ptBR}
        month={displayMonth}
        onMonthChange={handleMonthChange}
        hideNavigation
        classNames={{
          months: "flex flex-col",
          month: "w-full",
          month_caption: "hidden",
          nav: "hidden",
          month_grid: "w-full border-collapse",
          weekdays: "flex w-full mb-1",
          weekday:
            "text-muted/50 w-9 text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center h-6",
          week: "flex w-full",
          day: cn(
            "relative p-0 text-center text-xs focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent/8 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg",
            props.mode === "range"
              ? "[&:has(>.day-range-end)]:rounded-r-lg [&:has(>.day-range-start)]:rounded-l-lg first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg"
              : "[&:has([aria-selected])]:rounded-lg",
          ),
          day_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-medium rounded-lg text-xs flex items-center justify-center transition-all duration-150 hover:bg-accent/10 hover:text-accent-text active:scale-95",
          ),
          range_start:
            "day-range-start [&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:font-bold [&>button]:rounded-l-lg [&>button]:shadow-md",
          range_end:
            "day-range-end [&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:font-bold [&>button]:rounded-r-lg [&>button]:shadow-md",
          selected:
            "[&:not(.day-outside)>button]:bg-accent [&:not(.day-outside)>button]:text-accent-foreground [&:not(.day-outside)>button]:font-bold [&:not(.day-outside)>button]:shadow-md [&:not(.day-outside)>button:hover]:bg-accent-strong [&:not(.day-outside)>button:hover]:text-accent-strong-foreground [&:not(.day-outside)>button:focus]:bg-accent [&:not(.day-outside)>button:focus]:text-accent-foreground",
          today:
            "[&:not(.day-outside)>button]:bg-accent/12 [&:not(.day-outside)>button]:text-accent-text [&:not(.day-outside)>button]:font-black [&:not(.day-outside)>button]:ring-1 [&:not(.day-outside)>button]:ring-accent/30",
          outside:
            "day-outside [&>button]:text-muted/20 opacity-30 pointer-events-none",
          disabled: "[&>button]:text-muted/30 opacity-30 pointer-events-none",
          range_middle:
            "[&>button]:bg-accent/8 [&>button]:text-accent-text [&>button]:font-medium",
          hidden: "invisible",
          ...classNames,
        }}
        components={{
          Chevron: ({ className: chevronClassName, orientation }) => {
            const iconCn = cn("h-3.5 w-3.5", chevronClassName);
            if (orientation === "left")
              return <ChevronLeft aria-hidden="true" className={iconCn} />;
            if (orientation === "up")
              return <ChevronUp aria-hidden="true" className={iconCn} />;
            if (orientation === "down")
              return <ChevronDown aria-hidden="true" className={iconCn} />;
            return <ChevronRight aria-hidden="true" className={iconCn} />;
          },
        }}
        {...props}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
