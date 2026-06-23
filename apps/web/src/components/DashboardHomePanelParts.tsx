import type { ReactNode } from "react";

export function PanelHeader({
  icon,
  iconClass,
  title,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
}) {
  return (
    <div className="card-header card-header-gradient">
      <div className="card-header-title-container">
        <div className={`card-header-icon ${iconClass}`}>{icon}</div>
        <h3 className="card-header-title">{title}</h3>
      </div>
    </div>
  );
}

export function AgingStat({
  label,
  value,
  valueClassName = "aging-stat-value",
}: {
  label: string;
  value: number | string;
  valueClassName?: string;
}) {
  return (
    <div className="aging-stat-col">
      <span className="aging-stat-label">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

export function getPromoBlobClass(
  index: number,
  kind: "primary" | "secondary",
) {
  const classes =
    kind === "primary"
      ? ["bg-blue-500", "bg-emerald-500", "bg-violet-600"]
      : ["bg-sky-400", "bg-green-400", "bg-pink-500"];
  return `w-full h-full rounded-full blur-3xl transition-colors duration-700 ${classes[index] ?? classes[2]}`;
}
