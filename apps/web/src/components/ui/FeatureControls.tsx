import type { ComponentProps, ReactNode } from "react";
import { Search } from "lucide-react";
import { CustomSelect, type CustomSelectOption } from "./CustomSelect";
import { cx, type FeatureIcon } from "./featureShared";

export function FeatureInput(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cx(
        "w-full min-h-11 rounded-lg border border-line bg-app px-3 text-sm",
        "font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]",
        "disabled:opacity-50 disabled:bg-app-elevated/50 disabled:cursor-not-allowed disabled:border-line/60",
        props.className,
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
  ...props
}: {
  ariaLabel?: string;
  className?: string | undefined;
  defaultValue?: Value;
  disabled?: boolean | undefined;
  leftIcon?: ReactNode | undefined;
  name?: string;
  onChange?: (value: Value) => void;
  options: readonly CustomSelectOption<Value>[];
  placeholder?: string;
  value?: Value;
}) {
  return (
    <CustomSelect
      {...props}
      className={cx(
        "min-h-11 rounded-lg border border-line bg-app px-3 text-sm",
        "font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]",
        className,
      )}
    />
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
      className="flex w-full max-w-full items-center rounded-lg border border-line/60 bg-app-elevated p-0.5 sm:gap-1"
      role="group"
    >
      {options.map((option) => {
        const OptionIcon = option.icon;
        const active = option.value === value;
        return (
          <button
            aria-pressed={active}
            className={cx(
              "inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-0 text-xs font-bold transition-all cursor-pointer sm:px-2.5 sm:font-black",
              active
                ? "bg-accent text-inverse shadow-sm"
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

export function FeatureTabs<Value extends string>({
  activeClassName = "is-active",
  ariaLabel,
  className = "settings-tabs",
  onChange,
  optionClassName,
  options,
  value,
}: {
  activeClassName?: string;
  ariaLabel: string;
  className?: string;
  onChange: (value: Value) => void;
  optionClassName?: string;
  options: ReadonlyArray<{
    icon?: FeatureIcon | undefined;
    label: ReactNode;
    value: Value;
  }>;
  value: Value;
}) {
  return (
    <div aria-label={ariaLabel} className={className} role="tablist">
      {options.map((option) => {
        const OptionIcon = option.icon;
        const active = option.value === value;
        return (
          <button
            aria-selected={active}
            className={cx(optionClassName, active && activeClassName)}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="tab"
            type="button"
          >
            {OptionIcon ? (
              <OptionIcon aria-hidden="true" className="size-4" />
            ) : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
