import type { ReactNode } from "react";

export function AgencyRowButton({
  disabled = false,
  icon,
  label,
  onClick,
  title,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="btn-secondary-flat py-1.5 px-3 text-xs"
      title={title}
      type="button"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
