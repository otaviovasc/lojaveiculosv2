import type { ComponentProps, ReactNode } from "react";
import { Search, X } from "lucide-react";
import { CustomSelect, type CustomSelectOption } from "./CustomSelect";
import { DatePickerField } from "./DatePickerField";
import { cx, type FeatureIcon } from "./featureShared";

export { FeatureTabs } from "./FeatureTabs";

export function FeatureInput({
  className,
  horizontalPadding = "default",
  ...props
}: ComponentProps<"input"> & {
  horizontalPadding?: "default" | "none";
}) {
  return (
    <input
      {...props}
      className={cx(
        "w-full min-h-11 rounded-lg border border-line bg-app text-sm",
        horizontalPadding === "default" ? "px-3" : "px-0",
        "font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]",
        "disabled:opacity-50 disabled:bg-app-elevated/50 disabled:cursor-not-allowed disabled:border-line/60",
        className,
      )}
    />
  );
}

export function FeatureTextarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full min-h-28 rounded-lg border border-line bg-app px-3 py-3 text-sm",
        "font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]",
        "disabled:opacity-50 disabled:bg-app-elevated/50 disabled:cursor-not-allowed disabled:border-line/60",
        props.className,
      )}
    />
  );
}

export function FeatureSearchField({
  className,
  inputClassName,
  label,
  ...props
}: ComponentProps<"input"> & {
  inputClassName?: string;
  label: string;
}) {
  return (
    <label className={cx("relative block", className)}>
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
      <FeatureInput {...props} className={cx("pl-10", inputClassName)} />
    </label>
  );
}

export function FeatureSelect<Value extends string = string>({
  className,
  density = "default",
  iconInset = false,
  radius = "default",
  ...props
}: {
  ariaLabel?: string;
  className?: string | undefined;
  defaultValue?: Value | undefined;
  density?: "compact" | "default";
  disabled?: boolean | undefined;
  emptyMessage?: string | undefined;
  iconInset?: boolean;
  leftIcon?: ReactNode | undefined;
  name?: string | undefined;
  onChange?: (value: Value) => void;
  options: readonly CustomSelectOption<Value>[];
  placeholder?: string | undefined;
  radius?: "default" | "md";
  searchable?: boolean | undefined;
  searchPlaceholder?: string | undefined;
  value?: Value | undefined;
}) {
  return (
    <CustomSelect
      {...props}
      className={cx(
        "border border-line bg-app px-3 text-sm",
        density === "compact" ? "!min-h-9 !py-1 !text-xs" : "min-h-11",
        iconInset && "!pl-8",
        radius === "md" ? "rounded-md" : "rounded-lg",
        "font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]",
        className,
      )}
    />
  );
}

export function FeatureDateField({
  align = "left",
  className,
  disabled,
  label,
  max,
  min,
  name,
  onChange,
  value,
}: {
  align?: "left" | "right" | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  label: string;
  max?: string | undefined;
  min?: string | undefined;
  name?: string | undefined;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className={cx("inline-flex w-full items-center gap-1", className)}>
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <DatePickerField
        align={align}
        isDisabled={disabled}
        label={label}
        maxDate={parseDateInputValue(max)}
        minDate={parseDateInputValue(min)}
        onChange={(date) => onChange(formatDateInputValue(date))}
        value={parseDateInputValue(value)}
      />
      {value ? (
        <button
          aria-label={`Limpar ${label}`}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-app text-muted hover:text-app-text"
          disabled={disabled}
          onClick={() => onChange("")}
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function FeatureSegmentedControl<Value extends string>({
  ariaLabel,
  disabled,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  disabled?: boolean | undefined;
  onChange: (value: Value) => void;
  options: ReadonlyArray<{
    icon?: FeatureIcon | undefined;
    label: ReactNode;
    value: Value;
  }>;
  value: Value;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="flex w-full max-w-full items-center rounded-[10px] border border-line/60 bg-app-elevated p-0.5 sm:gap-1"
      role="group"
    >
      {options.map((option) => {
        const OptionIcon = option.icon;
        const active = option.value === value;
        return (
          <button
            aria-pressed={active}
            className={cx(
              "inline-flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-0 text-xs font-bold transition-colors sm:px-2.5 sm:font-black",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-app-text",
            )}
            disabled={disabled}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {OptionIcon ? (
              <OptionIcon aria-hidden="true" className="size-3.5" />
            ) : null}
            <span className="whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function parseDateInputValue(value: string | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }
  return date;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
