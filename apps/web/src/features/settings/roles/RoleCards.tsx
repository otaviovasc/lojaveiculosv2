import type { RoleKey } from "../types";
import { Check, Sparkles, X } from "lucide-react";
import { cx } from "../../../components/ui/featureShared";
import { getRoleVisual, type CustomRolePreset } from "./RoleHelpers";

export function RoleCard({
  role,
  label,
  description,
  isSelected,
  disabled,
  onClick,
}: {
  role: RoleKey;
  label: string;
  description: string;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const visual = getRoleVisual(role);
  const Icon = visual.icon;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
      className={cx(
        "group relative flex items-start gap-3 text-left p-4 rounded-xl border transition-all duration-300 w-full cursor-pointer",
        isSelected
          ? visual.selected
          : "border-line bg-panel hover:bg-app-elevated/40 hover:border-line-strong",
        disabled && "opacity-80 cursor-not-allowed",
      )}
    >
      <span
        className={cx(
          "flex size-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-300 group-hover:scale-105",
          visual.tile,
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-black text-app-text">
          {label}
        </strong>
        <span className="mt-1 block text-xs font-bold text-muted leading-relaxed">
          {description}
        </span>
      </span>
      {isSelected && (
        <span
          className={cx(
            "flex size-5 items-center justify-center rounded-full shrink-0",
            visual.tile,
          )}
        >
          <Check className={cx("size-3.5", visual.accent)} strokeWidth={3} />
        </span>
      )}
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
  const baseVisual = getRoleVisual(role.baseRole);
  return (
    <div className="relative group w-full">
      <button
        disabled={disabled}
        onClick={onSelect}
        type="button"
        className={cx(
          "flex flex-col text-left p-4 rounded-xl border transition-all duration-300 w-full cursor-pointer pr-10",
          isSelected
            ? "border-accent bg-accent-soft/30"
            : "border-line bg-panel hover:bg-app-elevated/40 hover:border-line-strong",
          disabled && "opacity-80 cursor-not-allowed",
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent-strong shrink-0">
            <Sparkles className="size-4" />
          </span>
          <strong className="min-w-0 flex-1 truncate text-sm font-black text-app-text">
            {role.name}
          </strong>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span
            className={cx(
              "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-black uppercase tracking-wider",
              baseVisual.chip,
            )}
          >
            {baseRoleLabel}
          </span>
          <span className="inline-flex items-center rounded bg-line/40 px-1.5 py-0.5 text-xs font-bold text-muted">
            {role.overrides.length} exceções
          </span>
        </div>
      </button>
      {!disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-lg border border-line bg-panel hover:border-danger hover:text-danger-text text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
          title="Excluir cargo customizado"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
