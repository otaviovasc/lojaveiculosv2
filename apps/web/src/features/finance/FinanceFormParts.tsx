import type { ComponentProps, ReactNode } from "react";
import {
  CustomSelect,
  type CustomSelectOption,
} from "../../components/ui/CustomSelect";
import type { FinanceEntryStatus, FinanceEntryType } from "./types";

export const financeTypeLabels: Record<FinanceEntryType, string> = {
  commission: "Comissoes",
  expense: "Gastos",
  revenue: "Receitas",
};

export const financeStatusLabels: Record<FinanceEntryStatus, string> = {
  cancelled: "Cancelado",
  paid: "Pago",
  pending: "Pendente",
};

export function FinancePanel({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-[var(--shadow-panel)]">
      <div className="mb-4 flex items-center gap-2 text-accent-strong">
        {icon}
        <h3 className="text-sm font-black text-app-text">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function FinanceField({
  children,
  hint,
  label,
}: {
  children: ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-app-text">
      <span>{label}</span>
      {children}
      {hint ? (
        <span className="text-xs font-bold text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function FinanceInput(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={[
        "min-h-11 rounded-lg border border-line bg-app px-3 text-sm",
        "font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

type FinanceSelectProps<Value extends string = string> = {
  ariaLabel?: string;
  className?: string;
  defaultValue?: Value;
  disabled?: boolean;
  name?: string;
  onChange?: (value: Value) => void;
  options: readonly CustomSelectOption<Value>[];
  value?: Value;
};

export function FinanceSelect<Value extends string = string>({
  className,
  ...props
}: FinanceSelectProps<Value>) {
  return (
    <CustomSelect
      {...props}
      className={[
        "min-h-11 rounded-lg border border-line bg-app px-3 text-sm",
        "font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function FinanceBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-black text-accent-strong">
      {children}
    </span>
  );
}
