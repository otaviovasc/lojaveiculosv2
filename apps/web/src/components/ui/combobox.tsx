"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

interface ComboboxProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  creatable?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecionar...",
  className,
  disabled,
  creatable = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 0, left: 0, width: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const filteredOptions = React.useMemo(
    () =>
      options
        .filter((option) =>
          option.label.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 50),
    [options, search],
  );

  const selectedOption = options.find((opt) => opt.value === value);

  const updateCoords = React.useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const margin = 8;
      setCoords({
        top: rect.bottom + window.scrollY + margin,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  // Sync coords on open
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (open) {
      updateCoords();
      // Use a small delay to ensure the input is mounted in the portal before focusing
      timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, updateCoords]);

  // Click outside handling
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        const portals = document.getElementsByClassName(
          "combobox-portal-content",
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

  // Sync scroll and resize
  React.useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open, updateCoords]);

  const dropdownContent = (
    <div
      className="combobox-portal-content"
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
        width: coords.width,
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
            className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden ring-1 ring-black/5"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-2 border-b border-border px-3 h-12 bg-muted/30 cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                className="flex h-full w-full bg-transparent text-sm placeholder:text-muted-foreground/50 border-none p-0 focus:ring-0 focus:ring-transparent focus:outline-none outline-none shadow-none"
                style={{ outline: "none", boxShadow: "none", border: "none" }}
                placeholder="Procurar ou filtrar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch("");
                    inputRef.current?.focus();
                  }}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors"
                  type="button"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="max-h-[280px] overflow-y-auto p-1.5 custom-scrollbar space-y-0.5">
              {filteredOptions.length === 0 ? (
                creatable && search ? (
                  <button
                    className="flex w-full cursor-pointer select-none items-center rounded-xl px-3 py-2.5 text-sm hover:bg-primary/10 text-primary font-medium transition-colors"
                    onClick={() => {
                      onChange(search);
                      setOpen(false);
                      setSearch("");
                    }}
                    type="button"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Usar &quot;{search}&quot;
                  </button>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground px-4">
                    Não encontramos resultados para &quot;{search}&quot;.
                  </div>
                )
              ) : (
                <>
                  {filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-xl px-3 py-2.5 text-sm transition-colors text-left",
                        value === option.value
                          ? "bg-primary/10 text-primary font-bold"
                          : "hover:bg-muted text-foreground",
                      )}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        setSearch("");
                      }}
                      type="button"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0 transition-opacity",
                          value === option.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                    </button>
                  ))}
                  {creatable &&
                    search &&
                    !options.some(
                      (o) => o.label.toLowerCase() === search.toLowerCase(),
                    ) && (
                      <button
                        className="flex w-full cursor-pointer select-none items-center rounded-xl px-3 py-2.5 text-sm hover:bg-primary/10 text-primary font-medium border-t border-border mt-1.5 pt-2 transition-colors"
                        onClick={() => {
                          onChange(search);
                          setOpen(false);
                          setSearch("");
                        }}
                        type="button"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Usar &quot;{search}&quot;
                      </button>
                    )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-2xl border border-input bg-card/50 px-4 py-3 text-base text-foreground shadow-sm transition-all duration-200 cursor-pointer text-left focus:outline-none",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        )}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span
          className={cn(
            "block truncate",
            !value && "text-muted-foreground/50 text-sm",
          )}
        >
          {selectedOption ? selectedOption.label : value || placeholder}
        </span>
        <ChevronsUpDown
          className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {mounted && open && createPortal(dropdownContent, document.body)}
    </div>
  );
}
