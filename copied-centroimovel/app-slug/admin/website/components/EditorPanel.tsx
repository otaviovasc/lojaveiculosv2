"use client";

import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Home,
  Info,
  Layers,
  MessageSquareQuote,
  Palette,
  Phone,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

interface AccordionItem {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

interface EditorPanelProps {
  items: AccordionItem[];
}

export function EditorPanel({ items }: EditorPanelProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3 p-4 sm:p-5 pb-36">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all"
          >
            {/* Accordion header */}
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-muted/30 active:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isOpen
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/50 text-muted-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    isOpen ? "text-foreground" : "text-foreground/85",
                  )}
                >
                  {item.title}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            </button>

            {/* Accordion content */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-out",
                isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0",
              )}
            >
              {isOpen && (
                <div className="border-t border-border/40 bg-muted/5 p-5">
                  {item.children}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Re-export icons for convenience so the page.tsx has a clean import */
export const SECTION_ICONS = {
  Sparkles,
  Palette,
  Home,
  User,
  MessageSquareQuote,
  Phone,
  Info,
  Layers,
} as const;
