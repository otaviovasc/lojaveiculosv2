import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

type SelectProps = React.ComponentProps<"select">;

function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative group w-full">
      <select
        className={cn(
          "flex h-12 w-full appearance-none rounded-2xl border border-input bg-card/50 px-4 py-3 pr-10 text-base text-foreground shadow-sm transition-all duration-200 cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
          "focus-visible:bg-card focus-visible:shadow-[0_0_15px_oklch(var(--primary)/0.15)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-primary/50 hover:bg-card",
          "touch-target",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
        <ChevronDown className="size-4" />
      </div>
    </div>
  );
}

export { Select };
export type { SelectProps };
