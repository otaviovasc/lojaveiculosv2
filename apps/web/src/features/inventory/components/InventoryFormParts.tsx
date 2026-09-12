import {
  forwardRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import { vehicleColorOptions, type VehicleColor } from "@lojaveiculosv2/shared";
import type { CustomSelectOption } from "../../../components/ui/CustomSelect";
import {
  FeatureInput,
  FeatureSelect,
} from "../../../components/ui/FeatureControls";
import {
  formatInventoryCurrencyInput,
  normalizeInventoryCurrencyEntry,
} from "../model/inventoryInputFormatting";

type FieldProps = {
  children: ReactNode;
  hint?: string | undefined;
  label: string;
  className?: string | undefined;
  required?: boolean | undefined;
};

export const InventoryPanel = forwardRef<
  HTMLElement,
  {
    bodyClassName?: string | undefined;
    children: ReactNode;
    icon: ReactNode;
    title: string;
  }
>(function InventoryPanel({ bodyClassName, children, icon, title }, ref) {
  return (
    <section className="glass-panel-branded dashboard-card" ref={ref}>
      <div className="card-header card-header-gradient border-b border-line/40">
        <div className="card-header-title-container">
          <div className="card-header-icon bg-accent-soft text-accent-strong border border-accent-soft/20">
            {icon}
          </div>
          <h3 className="card-header-title">{title}</h3>
        </div>
      </div>
      <div className={["card-body", bodyClassName].filter(Boolean).join(" ")}>
        {children}
      </div>
    </section>
  );
});

export const InventoryField = forwardRef<HTMLLabelElement, FieldProps>(
  function InventoryField({ children, hint, label, className, required }, ref) {
    return (
      <label
        className={["grid gap-2 text-sm font-black text-app-text", className]
          .filter(Boolean)
          .join(" ")}
        ref={ref}
      >
        <span>
          {label}
          {required ? (
            <span className="text-accent-strong ml-1" aria-hidden="true">
              *
            </span>
          ) : null}
        </span>
        {children}
        {hint ? (
          <span className="text-xs font-bold text-muted">{hint}</span>
        ) : null}
      </label>
    );
  },
);

export function InventoryInput(props: ComponentProps<"input">) {
  return <FeatureInput {...props} />;
}

export function InventoryCurrencyInput({
  className,
  onBlur,
  onFocus,
  onValueChange,
  value,
  ...props
}: Omit<ComponentProps<"input">, "onChange" | "value"> & {
  onValueChange: (value: string) => void;
  value: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-muted"
      >
        R$
      </span>
      <InventoryInput
        {...props}
        className={["pl-10 font-mono tabular-nums", className]
          .filter(Boolean)
          .join(" ")}
        inputMode="decimal"
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onChange={(event) =>
          onValueChange(normalizeInventoryCurrencyEntry(event.target.value))
        }
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        value={isFocused ? value : formatInventoryCurrencyInput(value)}
      />
    </div>
  );
}

type InventorySelectProps<Value extends string = string> = {
  ariaLabel?: string;
  className?: string;
  defaultValue?: Value;
  disabled?: boolean;
  name?: string;
  onChange?: (value: Value) => void;
  options: readonly CustomSelectOption<Value>[];
  value?: Value;
};

export function InventorySelect<Value extends string = string>({
  className,
  ...props
}: InventorySelectProps<Value>) {
  return <FeatureSelect {...props} className={className} />;
}

type InventoryColorSelectProps = {
  className?: string;
  onChange: (value: VehicleColor | "") => void;
  value: VehicleColor | "";
};

export function InventoryColorSelect({
  className,
  onChange,
  value,
}: InventoryColorSelectProps) {
  const options: CustomSelectOption<VehicleColor | "">[] = [
    { label: "Selecione", value: "" },
    ...vehicleColorOptions.map((option) => ({
      label: (
        <VehicleColorOptionLabel label={option.label} swatch={option.swatch} />
      ),
      value: option.value,
    })),
  ];

  return (
    <InventorySelect
      {...(className !== undefined ? { className } : {})}
      onChange={onChange}
      options={options}
      value={value}
    />
  );
}

export function VehicleColorOptionLabel({
  label,
  swatch,
}: {
  label: string;
  swatch: string;
}) {
  return (
    <span className="vehicle-color-option">
      <span
        aria-hidden="true"
        className="vehicle-color-swatch"
        style={createColorSwatchStyle(swatch)}
      />
      <span>{label}</span>
    </span>
  );
}

export function InventoryTextarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={[
        "min-h-28 rounded-lg border border-line bg-app px-3 py-3 text-sm",
        "font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

function createColorSwatchStyle(swatch: string) {
  return { "--vehicle-color-swatch": swatch } as CSSProperties;
}

export function InventoryBadge({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "blue" | "warning";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-soft text-app-text"
      : tone === "warning"
        ? "bg-warning text-app-text"
        : "bg-accent-soft text-accent-strong";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${toneClass}`}>
      {children}
    </span>
  );
}
