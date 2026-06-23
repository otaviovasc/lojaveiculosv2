import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

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
    "w-4 h-4 text-muted transition-transform",
    active ? "rotate-180" : "",
  ].join(" ");

  return (
    <section className="bg-app-elevated border border-line rounded-2xl overflow-hidden">
      <header
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-line/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent-strong flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-sm font-black text-app-text">{title}</h3>
        </div>
        <ChevronDown className={chevronClassName} />
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
    "rounded-lg border text-xs font-black transition-all cursor-pointer",
    active
      ? "bg-accent text-inverse border-accent"
      : "bg-app text-app-text border-line hover:bg-line/20",
  ].join(" ");

  return (
    <button onClick={onClick} className={className}>
      {children}
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
}: {
  label: string;
  max: string;
  min: string;
  onChange: (value: number) => void;
  step: string;
  value: number;
  valueLabel: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span>{valueLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}
