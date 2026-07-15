import { Flame } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  getInventoryLeadInterestLevel,
  type InventoryLeadInterestLevel,
} from "../model/listCatalogModel";

type InventoryLeadBadgeVariant = "compact" | "table";

const interestToneClasses: Record<
  Exclude<InventoryLeadInterestLevel, "none">,
  { badge: string; icon: string; title: string }
> = {
  healthy: {
    badge: "bg-success/10 text-success-strong border-success/20",
    icon: "text-success-strong",
    title: "Interesse saudavel",
  },
  hot: {
    badge: "bg-warning/10 text-warning-strong border-warning/20",
    icon: "text-warning-strong",
    title: "Esquentando",
  },
  very_hot: {
    badge: "bg-danger/10 text-danger border-danger/20",
    icon: "text-danger",
    title: "Muito quente, precisa de atencao",
  },
};

export function InventoryLeadBadge({
  leads,
  variant = "table",
}: {
  leads: number;
  variant?: InventoryLeadBadgeVariant;
}) {
  const level = getInventoryLeadInterestLevel(leads);

  if (level === "none") return null;

  const tone = interestToneClasses[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border py-0.5 text-xs font-black",
        variant === "table" ? "rounded-full px-2" : "rounded px-1.5",
        tone.badge,
      )}
      title={tone.title}
    >
      <Flame
        aria-hidden="true"
        className={cn(
          "size-3",
          tone.icon,
          level === "very_hot" && "animate-pulse",
        )}
      />
      <span>
        {leads} {leads === 1 ? "lead" : "leads"}
      </span>
    </span>
  );
}
