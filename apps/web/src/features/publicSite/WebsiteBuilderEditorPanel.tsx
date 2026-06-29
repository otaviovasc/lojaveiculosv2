import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type WebsiteBuilderAccordionItem = {
  children: ReactNode;
  icon: LucideIcon;
  id: string;
  title: string;
};

export function WebsiteBuilderEditorPanel({
  items,
}: {
  items: WebsiteBuilderAccordionItem[];
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="space-y-3 p-4 pb-36 sm:p-5">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all"
            key={item.id}
          >
            <button
              className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-muted/30 active:bg-muted/40"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              type="button"
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

            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-out",
                isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0",
              )}
            >
              {isOpen ? (
                <div className="border-t border-border/40 bg-muted/5 p-5">
                  {item.children}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
