import { Check, ChevronDown, RotateCcw } from "lucide-react";
import { useId, type ReactNode } from "react";

export function ControlSection({
  active,
  children,
  icon,
  onToggle,
  title,
}: {
  active: boolean;
  children: ReactNode;
  icon: ReactNode;
  onToggle: () => void;
  title: string;
}) {
  const chevronClassName = [
    "size-4 transition-transform",
    active ? "rotate-180 text-accent-soft-foreground" : "text-muted",
  ].join(" ");
  const sectionClassName = [
    "overflow-hidden rounded-2xl border transition-[background-color,border-color]",
    active ? "border-accent bg-app-elevated" : "border-line bg-app-elevated",
  ].join(" ");

  return (
    <section
      className={sectionClassName}
      data-state={active ? "open" : "closed"}
    >
      <header>
        <button
          aria-expanded={active}
          className={[
            "flex min-h-14 w-full cursor-pointer items-center justify-between p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
            active
              ? "bg-accent-soft text-accent-soft-foreground"
              : "text-app-text hover:bg-line/20",
          ].join(" ")}
          onClick={onToggle}
          type="button"
        >
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex size-8 items-center justify-center rounded-lg border transition-colors",
                active
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-line bg-panel text-accent-text",
              ].join(" ")}
            >
              {icon}
            </div>
            <h3 className="text-sm font-black">{title}</h3>
          </div>
          <ChevronDown aria-hidden="true" className={chevronClassName} />
        </button>
      </header>
      {active && children}
    </section>
  );
}

export function ToggleButton({
  active,
  children,
  compact = false,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  compact?: boolean;
  onClick: () => void;
}) {
  const className = [
    compact ? "min-h-9 capitalize" : "min-h-11",
    "cursor-pointer rounded-lg border px-3 text-xs font-black outline-none transition-[background-color,border-color,color,transform] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel active:translate-y-px",
    active
      ? "border-accent bg-accent text-accent-foreground"
      : "border-line bg-app text-app-text hover:border-line-strong hover:bg-app-elevated",
  ].join(" ");

  return (
    <button
      aria-pressed={active}
      className={className}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center justify-center gap-1.5">
        {active ? <Check aria-hidden="true" className="size-3.5" /> : null}
        {children}
      </span>
    </button>
  );
}

export function RangeControl({
  label,
  max,
  min,
  onChange,
  step,
  value,
  valueLabel,
  defaultValue,
  maxLabel,
  minLabel,
}: {
  defaultValue?: number;
  label: string;
  max: string;
  maxLabel?: string;
  min: string;
  minLabel?: string;
  onChange: (value: number) => void;
  step: string;
  value: number;
  valueLabel: string;
}) {
  const inputId = useId();
  const minimum = Number(min);
  const maximum = Number(max);
  const progress = Math.min(
    100,
    Math.max(0, ((value - minimum) / (maximum - minimum)) * 100),
  );
  const canReset = defaultValue !== undefined && value !== defaultValue;

  return (
    <div className="rounded-xl border border-line bg-app px-3 py-3 transition-[background-color,border-color] focus-within:border-accent focus-within:bg-panel focus-within:ring-2 focus-within:ring-accent/20">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-black text-app-text" htmlFor={inputId}>
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <output
            className="min-w-14 rounded-md border border-line bg-app-elevated px-2 py-1 text-center text-xs font-black tabular-nums text-app-text"
            htmlFor={inputId}
          >
            {valueLabel}
          </output>
          <button
            aria-label={`Restaurar ${label}`}
            className="grid size-7 cursor-pointer place-items-center rounded-md border border-line bg-panel text-muted outline-none transition-colors hover:border-line-strong hover:text-app-text focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-0"
            disabled={!canReset}
            onClick={() => {
              if (defaultValue !== undefined) onChange(defaultValue);
            }}
            title={`Restaurar ${label}`}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="relative mt-2 flex h-8 items-center">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-line-strong"
        />
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent"
          style={{ width: `${progress}%` }}
        />
        <input
          aria-label={label}
          className="absolute inset-0 h-8 w-full cursor-ew-resize appearance-none bg-transparent outline-none [&::-moz-range-progress]:bg-transparent [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-panel [&::-moz-range-thumb]:bg-accent [&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-panel [&::-webkit-slider-thumb]:bg-accent"
          id={inputId}
          max={max}
          min={min}
          onChange={(event) => onChange(Number(event.target.value))}
          step={step}
          type="range"
          value={value}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs font-bold tabular-nums text-muted">
        <span>{minLabel ?? min}</span>
        <span>{maxLabel ?? max}</span>
      </div>
    </div>
  );
}

export function ContentToggle({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  description?: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const containerClassName = [
    "flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 outline-none transition-[background-color,border-color,transform] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-panel has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 active:translate-y-px",
    checked
      ? "border-accent bg-accent-soft"
      : "border-line bg-app hover:border-line-strong hover:bg-app-elevated",
  ].join(" ");
  const titleClassName = checked
    ? "block text-xs font-black text-accent-soft-foreground"
    : "block text-xs font-black text-app-text";
  const descriptionClassName = checked
    ? "mt-0.5 block text-xs font-bold text-accent-soft-muted"
    : "mt-0.5 block text-xs font-bold text-muted";

  return (
    <label className={containerClassName} data-state={checked ? "on" : "off"}>
      <span className="min-w-0">
        <span className={titleClassName}>{label}</span>
        {description ? (
          <span className={descriptionClassName}>{description}</span>
        ) : null}
      </span>
      <input
        checked={checked}
        className="peer sr-only"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full border border-line bg-app-elevated transition-colors after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-muted after:transition-transform peer-checked:border-accent peer-checked:bg-accent peer-checked:after:translate-x-5 peer-checked:after:bg-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-panel"
      />
    </label>
  );
}
