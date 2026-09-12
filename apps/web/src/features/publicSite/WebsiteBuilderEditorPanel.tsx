import { ChevronDown, Search, X } from "lucide-react";
import { useState, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { LucideIcon } from "lucide-react";

export type WebsiteBuilderAccordionItem = {
  children: ReactNode;
  icon: LucideIcon;
  id: string;
  title: string;
};

export type WebsiteBuilderEditorGroups = {
  advanced?: WebsiteBuilderAccordionItem[];
  checklist: WebsiteBuilderAccordionItem[];
};

export function WebsiteBuilderEditorPanel({
  groups,
}: {
  groups: WebsiteBuilderEditorGroups;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(
    groups.checklist[0]?.id ?? null,
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups.checklist;
    return groups.checklist.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    );
  }, [groups.checklist, searchQuery]);

  return (
    <div className="space-y-2.5 p-3 pb-28">
      <div>
        <Input
          endIcon={
            searchQuery ? (
              <button
                aria-label="Limpar busca"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null
          }
          inputSize="sm"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar seção (ex: Marca, Cores, Contato)..."
          startIcon={<Search className="h-3.5 w-3.5" />}
          value={searchQuery}
        />
      </div>

      {filteredItems.length > 0 ? (
        filteredItems.map((item, index) => (
          <WebsiteBuilderAccordionCard
            isOpen={searchQuery.trim() !== "" || openId === item.id}
            item={item}
            key={item.id}
            onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            step={groups.checklist.indexOf(item) + 1}
          />
        ))
      ) : (
        <div className="rounded-lg border border-border/40 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          Nenhuma seção encontrada para "{searchQuery}".
        </div>
      )}
    </div>
  );
}

function WebsiteBuilderAccordionCard({
  isOpen,
  item,
  onToggle,
  step,
}: {
  isOpen: boolean;
  item: WebsiteBuilderAccordionItem;
  onToggle: () => void;
  step?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/40 bg-card/60 transition-all">
      <button
        className="flex w-full items-center justify-between px-3.5 py-3 text-left transition-colors hover:bg-muted/20 active:bg-muted/30"
        onClick={onToggle}
        type="button"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
              isOpen
                ? "bg-primary/10 text-primary"
                : "bg-muted/50 text-muted-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
          </div>
          {step !== undefined ? (
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                isOpen
                  ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                  : "border border-border/60 bg-muted text-muted-foreground",
              )}
            >
              {step}
            </span>
          ) : null}
          <span
            className={cn(
              "text-xs font-semibold transition-colors",
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
          "overflow-hidden transition-all duration-200 ease-out",
          isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        {isOpen ? (
          <div className="border-t border-border/30 bg-muted/5 p-3.5">
            {item.children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
