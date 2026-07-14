import { useEffect, useRef, useState, type ComponentProps } from "react";
import { formatPercentage, parsePercentage } from "./saleServicesFormat";

type SalePercentageInputProps = Omit<
  ComponentProps<"input">,
  "defaultValue" | "onChange" | "value"
> & {
  onValueChange: (value: number | null) => void;
  value: number | null | undefined;
};

export function SalePercentageInput({
  inputMode = "decimal",
  onBlur,
  onFocus,
  onValueChange,
  type = "text",
  value,
  ...inputProps
}: SalePercentageInputProps) {
  const formattedValue = formatPercentage(value);
  const [rawValue, setRawValue] = useState(() => formattedValue);
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setRawValue(formattedValue);
  }, [formattedValue]);

  return (
    <input
      {...inputProps}
      inputMode={inputMode}
      onBlur={(event) => {
        editingRef.current = false;
        const parsedValue = parsePercentage(rawValue);
        setRawValue(formatPercentage(parsedValue));
        onValueChange(parsedValue);
        onBlur?.(event);
      }}
      onChange={(event) => {
        const nextRawValue = event.target.value;
        setRawValue(nextRawValue);
        onValueChange(parsePercentage(nextRawValue));
      }}
      onFocus={(event) => {
        editingRef.current = true;
        onFocus?.(event);
      }}
      type={type}
      value={rawValue}
    />
  );
}
