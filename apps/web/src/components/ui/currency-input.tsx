"use client";

import { Input } from "@/components/ui/input";
import { formatCurrencyValue, parseCurrencyInput } from "@/lib/masks";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  hasError?: boolean;
  "aria-label"?: string;
}

export function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = "0,00",
  required,
  disabled,
  className,
  inputClassName,
  hasError,
  "aria-label": ariaLabel,
}: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseCurrencyInput(e.target.value);
    onChange(numericValue);
  };

  const displayValue = value ? formatCurrencyValue(value) : "";

  return (
    <div className={cn("relative", className)}>
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-medium">
        R$
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "pl-12 text-lg font-mono font-bold",
          hasError && "border-destructive focus-visible:ring-destructive",
          inputClassName,
        )}
      />
    </div>
  );
}
