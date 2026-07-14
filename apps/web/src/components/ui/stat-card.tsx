import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const THEMES = {
  brand: {
    bgGradient: "from-brand/10 via-card to-background",
    iconBg:
      "bg-primary/10 text-primary border-primary/20 group-hover:bg-primary/15",
    glow: "bg-primary/10",
    bottomBorder: "from-brand via-brand-light to-brand",
    hoverBorder: "group-hover:border-primary/30",
  },
  success: {
    bgGradient: "from-success/10 via-card to-background",
    iconBg:
      "bg-success/10 text-success-soft-foreground border-success/20 group-hover:bg-success/10",
    glow: "bg-success/10",
    bottomBorder: "from-success via-success/70 to-success",
    hoverBorder: "group-hover:border-success/30",
  },
  indigo: {
    bgGradient: "from-indigo-500/10 via-card to-background",
    iconBg:
      "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 group-hover:bg-indigo-500/15",
    glow: "bg-indigo-500/10",
    bottomBorder: "from-indigo-500 via-indigo-400 to-indigo-500",
    hoverBorder: "group-hover:border-indigo-500/30",
  },
  emerald: {
    bgGradient: "from-emerald-500/10 via-card to-background",
    iconBg:
      "bg-emerald-500/10 text-success-soft-foreground border-emerald-500/20 group-hover:bg-emerald-500/10",
    glow: "bg-emerald-500/10",
    bottomBorder: "from-emerald-500 via-emerald-400 to-emerald-500",
    hoverBorder: "group-hover:border-emerald-500/30",
  },
  amber: {
    bgGradient: "from-amber-500/10 via-card to-background",
    iconBg:
      "bg-amber-500/10 text-warning-soft-foreground border-amber-500/20 group-hover:bg-amber-500/10",
    glow: "bg-amber-500/10",
    bottomBorder: "from-amber-500 via-amber-400 to-amber-500",
    hoverBorder: "group-hover:border-amber-500/30",
  },
  blue: {
    bgGradient: "from-blue-500/10 via-card to-background",
    iconBg:
      "bg-blue-500/10 text-info-soft-foreground border-blue-500/20 group-hover:bg-blue-500/10",
    glow: "bg-blue-500/10",
    bottomBorder: "from-blue-500 via-blue-400 to-blue-500",
    hoverBorder: "group-hover:border-blue-500/30",
  },
  default: {
    bgGradient: "from-muted/5 via-card to-background",
    iconBg:
      "bg-primary/10 text-primary border-primary/15 group-hover:bg-primary/15",
    glow: "bg-primary/10",
    bottomBorder: "from-primary via-brand-light to-primary",
    hoverBorder: "group-hover:border-primary/20",
  },
};

interface StatCardProps {
  label: React.ReactNode;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
  theme?: keyof typeof THEMES;
  variant?: "card" | "cell";
}

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
  theme = "default",
  variant = "card",
}: StatCardProps) {
  const currentTheme = THEMES[theme] || THEMES.default;

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden transition-all duration-300 w-full h-full",
        variant === "card"
          ? "rounded-2xl border border-border/50 bg-card/45 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] " +
              currentTheme.hoverBorder
          : "p-5 md:p-6 bg-card/40 hover:bg-card/65",
        className,
      )}
    >
      {/* Decorative gradient glowing spots in background */}
      <div className="absolute inset-0 -z-10 pointer-events-none transition-all duration-300">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-40 transition-all duration-300",
            currentTheme.bgGradient,
          )}
        />
        <div
          className={cn(
            "absolute -top-[30%] -right-[15%] w-[60%] aspect-square rounded-full blur-[40px] opacity-10 transition-all duration-300",
            currentTheme.glow,
          )}
        />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 transition-colors group-hover:text-foreground/80">
            {label}
          </div>
          <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-foreground tracking-tight">
            {value}
          </div>
          {trend && (
            <p
              className={cn(
                "mt-1.5 text-xs font-semibold",
                trend.positive ? "text-success" : "text-destructive",
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
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-110",
              currentTheme.iconBg,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Themed bottom accent line on hover */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r opacity-0 transition-all duration-300 group-hover:opacity-100 rounded-full mx-2 mb-[1px]",
          currentTheme.bottomBorder,
        )}
      />
    </div>
  );
}

export { StatCard };
export type { StatCardProps };
