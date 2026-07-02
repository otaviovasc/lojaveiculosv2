import { cn } from "@/lib/utils";

interface LabelProps extends React.ComponentProps<"label"> {
  required?: boolean;
}

function Label({ className, children, required, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "block text-sm font-semibold tracking-wide uppercase text-muted-foreground/80 mb-2 px-1 select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="text-primary ml-1">*</span>}
    </label>
  );
}

export { Label };
export type { LabelProps };
