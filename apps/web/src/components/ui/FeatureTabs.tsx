import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx, type FeatureIcon } from "./featureShared";

type FeatureTabOption<Value extends string> = {
  icon?: FeatureIcon | undefined;
  label: ReactNode;
  value: Value;
};

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
  options: ReadonlyArray<FeatureTabOption<Value>>;
  value: Value;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = options.findIndex((option) => option.value === value);

  const moveFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    }

    const nextOption = nextIndex === null ? undefined : options[nextIndex];
    if (nextIndex === null || !nextOption) return;

    event.preventDefault();
    onChange(nextOption.value);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div aria-label={ariaLabel} className={className} role="tablist">
      {options.map((option, index) => {
        const OptionIcon = option.icon;
        const active = option.value === value;
        return (
          <button
            aria-selected={active}
            className={cx(optionClassName, active && activeClassName)}
            key={option.value}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => moveFocus(event, index)}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            role="tab"
            tabIndex={active || (activeIndex < 0 && index === 0) ? 0 : -1}
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
