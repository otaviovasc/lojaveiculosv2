import { cn } from "@/lib/utils";
import * as React from "react";

interface InputProps extends React.ComponentProps<"input"> {
  startIcon?: React.ReactNode;
  inputSize?: "default" | "sm";
}

function Input({
  className,
  type,
  startIcon,
  inputSize = "default",
  ...props
}: InputProps) {
  const inputEl = (
    <input
      type={type}
      className={cn(
        "flex w-full rounded-2xl border border-input bg-card/50 text-foreground shadow-sm transition-all duration-200",
        "placeholder:text-muted-foreground/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
        "focus-visible:bg-card focus-visible:shadow-[0_0_15px_oklch(var(--primary)/0.15)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "hover:border-line-strong hover:bg-card",
        "touch-target",
        inputSize === "sm"
          ? "h-9 px-3 py-1.5 text-sm"
          : "h-12 px-4 py-3 text-base",
        startIcon && (inputSize === "sm" ? "pl-9" : "pl-11"),
        className,
      )}
      {...props}
    />
  );

  if (startIcon) {
    return (
      <div className="relative w-full flex items-center">
        <div
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-muted-foreground",
            inputSize === "sm" ? "[&_svg]:size-4" : "[&_svg]:size-5",
          )}
        >
          {startIcon}
        </div>
        {inputEl}
      </div>
    );
  }

  return inputEl;
}

export { Input };
export type { InputProps };
