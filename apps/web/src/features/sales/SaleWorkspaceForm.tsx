import type { ReactNode } from "react";

export function SaleFormSection({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <section className="sales-glass-panel p-5 bg-panel border border-line">
      <div className="flex items-center gap-2 border-b border-line/50 pb-3 mb-4">
        {icon}
        <h3 className="text-sm font-black text-app-text uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function SaleField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-muted uppercase tracking-wider">
      {label}
      {children}
    </label>
  );
}
