import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileEditorTab({
  active,
  hasIndicator,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  hasIndicator?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-bold transition-all sm:text-xs",
        active
          ? "bg-primary/5 text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" />
      <span>{label}</span>
      {hasIndicator ? (
        <span className="absolute right-[calc(50%-14px)] top-1.5 size-2 rounded-full border border-card bg-primary" />
      ) : null}
    </button>
  );
}
