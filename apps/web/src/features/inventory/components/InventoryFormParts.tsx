import type { ComponentProps, ReactNode } from "react";

type FieldProps = {
  children: ReactNode;
  hint?: string;
  label: string;
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

export function InventoryField({ children, hint, label }: FieldProps) {
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

export function InventoryInput(props: ComponentProps<"input">) {
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

export function InventorySelect(props: ComponentProps<"select">) {
  return (
    <select
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
