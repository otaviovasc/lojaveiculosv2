import type { ComponentProps, ReactNode } from "react";
import {
  FeatureDateField,
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import type { CustomSelectOption } from "../../components/ui/CustomSelect";
import { cx } from "../../components/ui/featureShared";
import type { FinanceEntryStatus, FinanceEntryType } from "./types";

export const financeTypeLabels: Record<FinanceEntryType, string> = {
  commission: "Comissões",
  expense: "Gastos",
  revenue: "Receitas",
};

export const financeStatusLabels: Record<FinanceEntryStatus, string> = {
  cancelled: "Cancelado",
  paid: "Pago",
  pending: "Pendente",
};

export function FinancePanel({
  actions,
  children,
  icon,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <FeatureSection actions={actions} icon={icon} title={title}>
      {children}
    </FeatureSection>
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
    <FeatureField hint={hint} label={label}>
      {children}
    </FeatureField>
  );
}

export function FinanceInput(props: ComponentProps<"input">) {
  return <FeatureInput {...props} />;
}

export function FinanceDateField({
  disabled,
  label,
  max,
  min,
  name,
  onChange,
  value,
}: {
  disabled?: boolean | undefined;
  label: string;
  max?: string | undefined;
  min?: string | undefined;
  name?: string | undefined;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <FeatureDateField
      disabled={disabled}
      label={label}
      max={max}
      min={min}
      name={name}
      onChange={onChange}
      value={value}
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
  return <FeatureSelect {...props} className={className} />;
}

export function FinanceBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "rounded-full bg-accent-soft px-3 py-1 text-xs font-black text-accent-strong",
        className,
      )}
    >
      {children}
    </span>
  );
}
