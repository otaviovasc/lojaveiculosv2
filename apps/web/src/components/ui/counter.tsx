"use client";

import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus } from "lucide-react";

interface CounterProps {
  value: number;
  onChange: (val: number) => void;
}

export function Counter({ value, onChange }: CounterProps) {
  return (
    <div className="flex items-center justify-between bg-card p-1.5 rounded-2xl border border-border/60 shadow-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-11 w-16 items-center justify-center rounded-xl bg-secondary text-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-30"
        disabled={value <= 0}
      >
        <Minus className="size-4" />
      </button>

      <div className="overflow-hidden w-full text-center">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="block text-xl font-bold font-mono tracking-tighter"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-11 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all hover:bg-primary/20 active:scale-95"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
