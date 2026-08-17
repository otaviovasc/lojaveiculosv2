import type { ReactNode } from "react";

export function AgencyRowButton({
  icon,
  label,
  onClick,
  title,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-secondary-flat py-1.5 px-3 text-xs"
      title={title}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
