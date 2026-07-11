import {
  FeatureDateField,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import type { CustomSelectOption } from "../../components/ui/CustomSelect";

export type CrmSelectOption<Value extends string = string> =
  CustomSelectOption<Value>;

export function CrmSelect<Value extends string = string>({
  className,
  ...props
}: {
  ariaLabel?: string;
  className?: string | undefined;
  disabled?: boolean | undefined;
  onChange?: (value: Value) => void;
  options: readonly CrmSelectOption<Value>[];
  placeholder?: string | undefined;
  value?: Value | undefined;
}) {
  const triggerClassName = className?.includes("crm-whatsapp-select")
    ? className
    : ["crm-input", className].filter(Boolean).join(" ");

  return <FeatureSelect {...props} className={triggerClassName} />;
}

export function CrmDateField({
  className,
  disabled,
  label,
  max,
  min,
  onChange,
  value,
}: {
  className?: string | undefined;
  disabled?: boolean | undefined;
  label: string;
  max?: string | undefined;
  min?: string | undefined;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <FeatureDateField
      className={className}
      disabled={disabled}
      label={label}
      max={max}
      min={min}
      onChange={onChange}
      value={value}
    />
  );
}
