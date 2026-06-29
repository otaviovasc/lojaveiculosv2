import type { RoleKey } from "../types";
import { X } from "lucide-react";
import { cx } from "../../../components/ui/featureShared";

type CustomRolePreset = {
  id: string;
  name: string;
  baseRole: RoleKey;
  overrides: { permission: string; allowed: boolean }[];
};

export function RoleCard({
  label,
  description,
  isSelected,
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
      className={cx(
        "flex flex-col text-left p-4 rounded-xl border transition-all duration-300 w-full cursor-pointer",
        isSelected
          ? "border-accent bg-accent-soft/30 shadow-sm"
          : "border-line bg-panel hover:bg-app-elevated/40",
        disabled && "opacity-80 cursor-not-allowed",
      )}
    >
      <strong className="text-sm font-black text-app-text">{label}</strong>
      <p className="mt-1.5 text-xs font-bold text-muted leading-relaxed">
        {description}
      </p>
    </button>
  );
}

export function CustomRoleCard({
  role,
  baseRoleLabel,
  isSelected,
  disabled,
  onSelect,
  onDelete,
}: {
  role: CustomRolePreset;
  baseRoleLabel: string;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative group w-full">
      <button
        disabled={disabled}
        onClick={onSelect}
        type="button"
        className={cx(
          "flex flex-col text-left p-4 rounded-xl border transition-all duration-300 w-full cursor-pointer pr-10",
          isSelected
            ? "border-accent bg-accent-soft/30 shadow-sm"
            : "border-line bg-panel hover:bg-app-elevated/40",
          disabled && "opacity-80 cursor-not-allowed",
        )}
      >
        <strong className="text-sm font-black text-app-text">
          {role.name}
        </strong>
        <p className="mt-1 text-xs font-bold text-muted leading-relaxed">
          Base: {baseRoleLabel} • {role.overrides.length} exceções
        </p>
      </button>
      {!disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-lg border border-line bg-panel hover:border-danger hover:text-danger text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm z-10"
          title="Excluir cargo customizado"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
