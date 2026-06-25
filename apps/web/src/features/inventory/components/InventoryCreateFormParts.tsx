import type { ReactNode } from "react";
import {
  CircleCheck,
  CircleDollarSign,
  Clock3,
  FileText,
  PauseCircle,
  Wrench,
} from "lucide-react";
import type { InventoryListingStatus } from "../model/types";

export function SectionPanel({
  children,
  icon,
  subtitle,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className="glass-panel-branded flex flex-col gap-5 rounded-2xl border border-line bg-panel p-6 shadow-[var(--shadow-panel)]">
      <header className="flex flex-col gap-1 border-b border-line pb-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-app-text">
          <span className="grid size-8 place-items-center rounded-md bg-accent-soft text-accent-strong border border-accent-soft/20">
            {icon}
          </span>
          {title}
        </h3>
        {subtitle ? (
          <p className="text-xs font-bold text-muted">{subtitle}</p>
        ) : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function choiceButtonClassName(selected: boolean) {
  return selected
    ? "min-h-8 rounded-lg border border-accent-strong bg-accent-soft px-3 text-xs font-bold text-accent-strong transition-all"
    : "min-h-8 rounded-lg border border-line bg-app px-3 text-xs font-bold text-app-text transition-all hover:bg-app-elevated";
}

export function statusButtonClassName(
  status: InventoryListingStatus,
  selected: boolean,
) {
  const base =
    "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border-2 px-3 text-xs font-bold transition-all";

  if (status === "in_preparation") {
    return [
      base,
      selected
        ? "border-warning bg-warning/20 text-warning ring-2 ring-warning/25"
        : "border-warning/20 bg-app text-warning hover:bg-warning/10",
    ].join(" ");
  }

  if (status === "available") {
    return [
      base,
      selected
        ? "border-emerald-500 bg-emerald-500/15 text-emerald-500 ring-2 ring-emerald-500/25"
        : "border-emerald-500/20 bg-app text-emerald-500 hover:bg-emerald-500/10",
    ].join(" ");
  }

  if (status === "reserved") {
    return [
      base,
      selected
        ? "border-warning bg-warning/20 text-warning ring-2 ring-warning/25"
        : "border-warning/20 bg-app text-warning hover:bg-warning/10",
    ].join(" ");
  }

  if (status === "sold") {
    return [
      base,
      selected
        ? "border-blue-500 bg-blue-soft text-blue-500 ring-2 ring-blue-500/25"
        : "border-blue-500/20 bg-app text-blue-500 hover:bg-blue-soft",
    ].join(" ");
  }

  if (status === "inactive") {
    return [
      base,
      selected
        ? "border-danger bg-danger/15 text-danger ring-2 ring-danger/25"
        : "border-danger/20 bg-app text-danger hover:bg-danger/10",
    ].join(" ");
  }

  return [
    base,
    selected
      ? "border-accent-strong bg-panel text-app-text ring-2 ring-accent-soft"
      : "border-line bg-app text-muted hover:bg-app-elevated",
  ].join(" ");
}

export function StatusOptionIcon({
  status,
}: {
  status: InventoryListingStatus;
}) {
  const className = "size-3.5 shrink-0";

  if (status === "in_preparation") {
    return <Wrench aria-hidden="true" className={className} />;
  }
  if (status === "available") {
    return <CircleCheck aria-hidden="true" className={className} />;
  }
  if (status === "reserved") {
    return <Clock3 aria-hidden="true" className={className} />;
  }
  if (status === "sold") {
    return <CircleDollarSign aria-hidden="true" className={className} />;
  }
  if (status === "inactive") {
    return <PauseCircle aria-hidden="true" className={className} />;
  }

  return <FileText aria-hidden="true" className={className} />;
}
