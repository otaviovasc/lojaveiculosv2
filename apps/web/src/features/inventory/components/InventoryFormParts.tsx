import { forwardRef, type ComponentProps, type ReactNode } from "react";
import {
  CustomSelect,
  type CustomSelectOption,
} from "../../../components/ui/CustomSelect";

type FieldProps = {
  children: ReactNode;
  hint?: string;
  label: string;
  className?: string | undefined;
};

export function InventoryPanel({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="glass-panel-branded dashboard-card">
      <div className="card-header card-header-gradient border-b border-line/40">
        <div className="card-header-title-container">
          <div className="card-header-icon bg-accent-soft text-accent-strong border border-accent-soft/20">
            {icon}
          </div>
          <h3 className="card-header-title">{title}</h3>
        </div>
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}

export const InventoryField = forwardRef<HTMLLabelElement, FieldProps>(
  function InventoryField({ children, hint, label, className }, ref) {
    return (
      <label
        className={["grid gap-2 text-sm font-black text-app-text", className]
          .filter(Boolean)
          .join(" ")}
        ref={ref}
      >
        <span>{label}</span>
        {children}
        {hint ? (
          <span className="text-xs font-bold text-muted">{hint}</span>
        ) : null}
      </label>
    );
  },
);

export function InventoryInput(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={[
        "min-h-11 rounded-lg border border-line bg-app px-3 text-sm",
        "font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]",
        "disabled:opacity-50 disabled:bg-app-elevated/50 disabled:cursor-not-allowed disabled:border-line/60",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
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
