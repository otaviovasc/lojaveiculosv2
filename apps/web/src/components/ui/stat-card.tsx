import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const THEMES = {
  brand: {
    iconBg:
      "bg-primary/10 text-primary border-primary/20 group-hover:bg-primary/15",
    accentBar: "bg-primary",
    hoverBorder: "group-hover:border-line-strong",
  },
  success: {
    iconBg:
      "bg-success/10 text-success-soft-foreground border-success/20 group-hover:bg-success/15",
    accentBar: "bg-success",
    hoverBorder: "group-hover:border-success/30",
  },
  indigo: {
    iconBg:
      "bg-blue-500/10 text-info-soft-foreground border-blue-500/20 group-hover:bg-blue-500/15",
    accentBar: "bg-blue-500",
    hoverBorder: "group-hover:border-blue-500/30",
  },
  emerald: {
    iconBg:
      "bg-success/10 text-success-soft-foreground border-success/20 group-hover:bg-success/15",
    accentBar: "bg-success",
    hoverBorder: "group-hover:border-success/30",
  },
  amber: {
    iconBg:
      "bg-amber-500/10 text-warning-soft-foreground border-amber-500/20 group-hover:bg-amber-500/15",
    accentBar: "bg-amber-500",
    hoverBorder: "group-hover:border-amber-500/30",
  },
  blue: {
    iconBg:
      "bg-blue-500/10 text-info-soft-foreground border-blue-500/20 group-hover:bg-blue-500/15",
    accentBar: "bg-blue-500",
    hoverBorder: "group-hover:border-blue-500/30",
  },
  default: {
    iconBg:
      "bg-primary/10 text-primary border-primary/15 group-hover:bg-primary/15",
    accentBar: "bg-primary",
    hoverBorder: "group-hover:border-line-strong",
  },
};

interface StatCardProps {
  label: React.ReactNode;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
  density?: "compact" | "default";
  theme?: keyof typeof THEMES;
  variant?: "card" | "cell";
}

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
  density = "default",
  theme = "default",
  variant = "card",
}: StatCardProps) {
  const currentTheme = THEMES[theme] || THEMES.default;

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden transition-all duration-300 w-full h-full",
        variant === "card"
          ? "rounded-2xl border border-border/50 bg-card p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] " +
              currentTheme.hoverBorder
          : density === "compact"
            ? "p-3 md:p-4 bg-card/40 hover:bg-card/65"
            : "p-5 md:p-6 bg-card/40 hover:bg-card/65",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 transition-colors group-hover:text-foreground/80">
            {label}
          </div>
          <div
            className={cn(
              "font-mono font-bold tabular-nums text-foreground tracking-tight",
              density === "compact" ? "mt-1 text-2xl" : "mt-2 text-3xl",
            )}
          >
            {value}
          </div>
          {trend && (
            <p
              className={cn(
                "mt-1.5 text-xs font-semibold",
                trend.positive ? "text-success-strong" : "text-destructive",
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center border transition-all duration-300 group-hover:scale-110",
              density === "compact"
                ? "h-8 w-8 rounded-lg"
                : "h-10 w-10 rounded-xl",
              currentTheme.iconBg,
            )}
          >
            <Icon className={density === "compact" ? "h-4 w-4" : "h-5 w-5"} />
          </div>
        )}
      </div>

      {/* Flat themed accent bar on hover */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          currentTheme.accentBar,
        )}
      />
    </div>
  );
}

export { StatCard };
export type { StatCardProps };
