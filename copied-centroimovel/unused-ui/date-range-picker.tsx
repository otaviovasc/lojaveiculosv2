"use client";

import { cn } from "@/lib/utils";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon, Check, ChevronDown, X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { Calendar } from "./calendar";

export interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

export interface DatePreset {
  label: string;
  getValue: () => DateRange;
}

interface DateRangePickerProps {
  value?: DateRange | null;
  onChange: (range: DateRange | null) => void;
  presets?: DatePreset[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const DEFAULT_PRESETS: DatePreset[] = [
  {
    label: "Hoje",
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Ontem",
    getValue: () => {
      const date = subDays(new Date(), 1);
      return { from: startOfDay(date), to: endOfDay(date) };
    },
  },
  {
    label: "Últimos 7 dias",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 7)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Últimos 30 dias",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 30)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Personalizado",
    getValue: () => ({ from: undefined, to: undefined }),
  },
];

export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  placeholder = "Período",
  className,
  disabled,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [showCustom, setShowCustom] = React.useState(false);
  const [pendingRange, setPendingRange] = React.useState<DateRange | null>(
    value || null,
  );
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number | "auto";
    right: number | "auto";
    width: number;
  }>({ top: 0, left: 0, right: "auto", width: 0 });

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Update pending range when value changes externally
  React.useEffect(() => {
    setPendingRange(value || null);
  }, [value]);

  const updateCoords = React.useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const margin = 8;
      const popoverWidth = showCustom ? 240 : 180; // Significantly reduced widths

      const spaceOnRight = window.innerWidth - rect.left;
      const shouldAlignRight = spaceOnRight < popoverWidth;

      setCoords({
        top: rect.bottom + window.scrollY + margin,
        left: shouldAlignRight ? "auto" : rect.left + window.scrollX,
        right: shouldAlignRight
          ? window.innerWidth - (rect.right + window.scrollX)
          : "auto",
        width: rect.width,
      });
    }
  }, [showCustom]);

  React.useEffect(() => {
    if (open) {
      updateCoords();
    } else {
      setShowCustom(false);
    }
  }, [open, updateCoords, showCustom]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        const portals = document.getElementsByClassName(
          "date-range-portal-content",
        );
        const isPortalClick = Array.from(portals).some((portal) =>
          portal.contains(event.target as Node),
        );
        if (isPortalClick) return;
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open, updateCoords]);

  const handlePresetSelect = (preset: DatePreset) => {
    if (preset.label === "Personalizado") {
      setShowCustom(true);
      return;
    }
    const range = preset.getValue();
    onChange(range);
    setOpen(false);
  };

  const handleApply = () => {
    if (pendingRange) {
      onChange(pendingRange);
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Reset to Today
    const today = { from: startOfDay(new Date()), to: endOfDay(new Date()) };
    onChange(today);
  };

  const displayLabel = React.useMemo(() => {
    if (!value?.from) return "";

    // Check if it matches any preset (except custom)
    for (const preset of presets) {
      if (preset.label === "Personalizado") continue;
      const pRange = preset.getValue();
      if (
        pRange.from?.getTime() === value.from.getTime() &&
        pRange.to?.getTime() === value.to?.getTime()
      ) {
        return preset.label;
      }
    }

    if (value.to) {
      return `${format(value.from, "dd/MM/yy", { locale: ptBR })} - ${format(value.to, "dd/MM/yy", { locale: ptBR })}`;
    }
    return format(value.from, "dd/MM/yy", { locale: ptBR });
  }, [value, presets]);

  const dropdownContent = (
    <div
      className="date-range-portal-content"
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left !== "auto" ? coords.left : undefined,
        right: coords.right !== "auto" ? coords.right : undefined,
        width: showCustom ? "auto" : Math.max(coords.width, 240),
        zIndex: 9999,
        pointerEvents: "auto",
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="rounded-[1.5rem] border border-border/50 bg-card/80 backdrop-blur-2xl shadow-2xl shadow-black/20 overflow-hidden ring-1 ring-black/5"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {!showCustom ? (
              <div className="p-2 space-y-1">
                {presets.map((preset) => {
                  const pRange = preset.getValue();
                  const isActive =
                    value &&
                    preset.label !== "Personalizado" &&
                    pRange.from?.getTime() === value.from?.getTime() &&
                    pRange.to?.getTime() === value.to?.getTime();

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className={cn(
                        "flex w-full cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-xs transition-all text-left",
                        isActive
                          ? "bg-primary/10 text-primary font-black uppercase tracking-widest text-[8px]"
                          : "hover:bg-muted text-foreground font-bold uppercase tracking-widest text-[8px] opacity-60 hover:opacity-100",
                      )}
                      onClick={() => handlePresetSelect(preset)}
                    >
                      <CalendarIcon
                        className={cn(
                          "mr-2 h-3 w-3 shrink-0",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground/30",
                        )}
                      />
                      <span className="truncate">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-2 flex flex-col gap-2">
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2 px-2">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                        Período Personalizado
                      </p>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tight">
                        Selecione o intervalo
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCustom(false)}
                      className="p-1 hover:bg-muted rounded-full transition-colors"
                    >
                      <X className="size-2.5 text-muted-foreground" />
                    </button>
                  </div>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={pendingRange?.from}
                    selected={{
                      from: pendingRange?.from,
                      to: pendingRange?.to,
                    }}
                    onSelect={(range: DateRange | undefined) => {
                      if (range) {
                        setPendingRange({ from: range.from, to: range.to });
                      } else {
                        setPendingRange(null);
                      }
                    }}
                    numberOfMonths={1}
                    className="rounded-xl"
                  />
                </div>
                <div className="p-1.5 border-t border-border/10 bg-secondary/10 flex items-center justify-between gap-1.5">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-muted-foreground/50 uppercase">
                      Período
                    </span>
                    <span className="text-[9px] font-bold text-primary">
                      {pendingRange?.from
                        ? format(pendingRange.from, "dd/MM")
                        : "--"}
                      {pendingRange?.to
                        ? ` - ${format(pendingRange.to, "dd/MM")}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowCustom(false)}
                      className="px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest hover:bg-muted transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleApply}
                      disabled={!pendingRange?.from || !pendingRange?.to}
                      className="flex items-center gap-1 px-3 py-1 rounded-md bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 disabled:grayscale"
                    >
                      <Check className="size-2" />
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={cn("relative w-fit h-full", className)} ref={containerRef}>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex h-full min-w-[180px] items-center justify-between rounded-[inherit] bg-transparent px-6 py-2 text-[11px] font-black uppercase tracking-widest text-foreground transition-all duration-300 cursor-pointer text-left hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          open && "border-primary/50 bg-secondary/50",
          value?.from && "border-primary/30",
        )}
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            !disabled && setOpen(!open);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <CalendarIcon
            className={cn(
              "size-4 transition-colors",
              value?.from ? "text-primary" : "text-muted-foreground/30",
            )}
          />
          <span
            className={cn(
              "block truncate font-bold tracking-tight",
              !value?.from && "text-muted-foreground/50",
            )}
          >
            {displayLabel || placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {value?.from && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded-full transition-colors"
              aria-label="Limpar filtro de data"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-300"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          />
        </div>
      </div>

      {mounted && open && createPortal(dropdownContent, document.body)}
    </div>
  );
}
