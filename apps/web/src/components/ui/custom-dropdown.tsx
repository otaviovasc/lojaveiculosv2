"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  label?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  label,
  className,
  triggerClassName,
  disabled,
  size = "lg",
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const sizeClasses = {
    sm: "h-10 rounded-xl px-3 text-xs",
    md: "h-11 rounded-xl px-4 text-sm",
    lg: "h-12 rounded-2xl px-4 text-sm",
  };

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const dropdownContent = (
    <div
      ref={dropdownRef}
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
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="rounded-[18px] border border-border bg-card shadow-2xl shadow-black/10 overflow-hidden ring-1 ring-black/5 p-1.5"
          >
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-0.5">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors text-left",
                    value === opt.value
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted text-foreground",
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.icon && (
                      <span className="flex-shrink-0 [&_svg]:h-4 [&_svg]:w-4">
                        {opt.icon}
                      </span>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {value === opt.value && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <label className="mb-1.5 ml-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between border border-input bg-card/50 transition-all duration-200 text-left hover:border-primary/50 hover:bg-card",
          sizeClasses[size],
          open &&
            "ring-2 ring-primary/20 border-primary focus:outline-none bg-card shadow-md",
          disabled && "opacity-50 cursor-not-allowed",
          triggerClassName,
        )}
        onClick={() => setOpen(!open)}
      >
        <span
          className={cn(
            "truncate font-medium flex items-center gap-2",
            !selectedOption && "text-muted-foreground",
          )}
        >
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="flex-shrink-0 [&_svg]:h-4 [&_svg]:w-4">
                  {selectedOption.icon}
                </span>
              )}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {mounted && open && createPortal(dropdownContent, document.body)}
    </div>
  );
}
