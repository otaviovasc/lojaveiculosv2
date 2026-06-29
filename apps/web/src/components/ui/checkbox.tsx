"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import * as React from "react";

/**
 * A custom Checkbox component that mimics Radix UI Checkbox behavior
 * without requiring the @radix-ui/react-checkbox dependency.
 */
const Checkbox = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ className, checked, onCheckedChange, ...props }, ref) => {
  const isChecked = checked === true || checked === "indeterminate";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(e);
    if (!props.disabled) {
      onCheckedChange?.(!isChecked);
    }
  };

  return (
    <button
      type="button"
      ref={ref}
      role="checkbox"
      aria-checked={checked === "indeterminate" ? "mixed" : isChecked}
      data-state={
        checked === "indeterminate"
          ? "indeterminate"
          : isChecked
            ? "checked"
            : "unchecked"
      }
      onClick={handleClick}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isChecked ? "bg-primary text-primary-foreground" : "bg-transparent",
        className,
      )}
      {...props}
    >
      <span className="flex items-center justify-center text-current">
        {isChecked &&
          (checked === "indeterminate" ? (
            <div className="h-0.5 w-2.5 bg-current rounded-full" />
          ) : (
            <Check className="h-3.5 w-3.5 stroke-3" />
          ))}
      </span>
    </button>
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
