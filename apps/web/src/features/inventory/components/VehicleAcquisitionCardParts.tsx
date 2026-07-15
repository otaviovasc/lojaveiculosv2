import type { ComponentProps, ReactNode } from "react";
import { RefreshCw, Truck } from "lucide-react";
import { InventoryField, InventoryInput } from "./InventoryFormParts";

export function CardHeader({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-3">
      <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
        <Truck className="size-4 text-muted" />
        <span>Aquisição</span>
      </h3>
      {isLoading ? (
        <RefreshCw className="size-4 animate-spin text-muted" />
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  onChange,
  value,
  ...inputProps
}: Omit<ComponentProps<typeof InventoryInput>, "onChange" | "value"> & {
  label: string;
  onChange: (value: string) => void;
  value?: string | null | undefined;
}) {
  return (
    <InventoryField label={label}>
      <InventoryInput
        {...inputProps}
        onChange={(event) => onChange(event.target.value)}
        value={value ?? ""}
      />
    </InventoryField>
  );
}

export function IconButton({
  disabled,
  icon,
  label,
  onClick,
  variant = "secondary",
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  const classes =
    variant === "primary"
      ? "bg-accent text-accent-foreground hover:bg-accent-strong hover:text-accent-strong-foreground"
      : "border border-line text-app-text hover:bg-line/25";
  return (
    <button
      className={`min-h-9 rounded-lg px-3 text-xs font-black transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-1.5 ${classes}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
