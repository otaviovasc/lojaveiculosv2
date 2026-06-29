import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input">;

function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-input bg-card/50 px-4 py-3 text-base text-foreground shadow-sm transition-all duration-200",
        "placeholder:text-muted-foreground/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
        "focus-visible:bg-card focus-visible:shadow-[0_0_15px_oklch(var(--primary)/0.15)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "hover:border-primary/50 hover:bg-card",
        "touch-target",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
export type { InputProps };
