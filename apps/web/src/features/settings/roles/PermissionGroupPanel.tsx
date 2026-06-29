import type { PermissionGroup, RoleManagementView } from "../types";
import type { Draft, OverrideMode } from "./roleDraft";
import { cx } from "../../../components/ui/featureShared";

export function PermissionGroupPanel({
  draft,
  editable,
  group,
  onModeChange,
  roles,
}: {
  draft: Draft;
  editable: boolean;
  group: PermissionGroup;
  onModeChange: (permission: string, mode: OverrideMode) => void;
  roles: RoleManagementView;
}) {
  const base = new Set(
    roles.roles.find((role) => role.role === draft.role)?.defaultPermissions ??
      [],
  );

  return (
    <div className="grid gap-3">
      <h4 className="text-xs font-black uppercase tracking-wider text-accent-strong mt-2">
        {group.label}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {group.permissions.map((permission) => {
          const mode = draft.overrides.get(permission.key) ?? "inherit";
          const inherited = mode === "inherit";
          const isAllowed = inherited
            ? base.has(permission.key)
            : mode === "allow";

          return (
            <article
              className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel/30 p-4 hover:border-accent/20 hover:shadow-md transition-all duration-300 min-h-[72px]"
              key={permission.key}
            >
              <div className="min-w-0 flex-1">
                <strong className="block text-sm font-black text-app-text">
                  {permission.label}
                </strong>
                <p className="mt-1 text-xs font-bold text-muted leading-relaxed">
                  {permission.description}
                </p>
              </div>

              <div
                className="flex items-center rounded-lg bg-app/60 p-0.5 border border-line shrink-0"
                role="group"
              >
                {(
                  [
                    { value: "inherit", label: "Herdado" },
                    { value: "allow", label: "Liberado" },
                    { value: "deny", label: "Bloqueado" },
                  ] as const
                ).map((option) => {
                  const active = mode === option.value;
                  return (
                    <button
                      key={option.value}
                      disabled={!editable}
                      onClick={() => onModeChange(permission.key, option.value)}
                      type="button"
                      className={cx(
                        "px-2 py-1 text-[9px] font-black uppercase rounded-md transition-all cursor-pointer",
                        active
                          ? option.value === "allow"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : option.value === "deny"
                              ? "bg-danger text-white shadow-sm"
                              : isAllowed
                                ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/10 shadow-sm"
                                : "bg-danger/20 text-danger border border-danger/10 shadow-sm"
                          : "text-muted hover:text-app-text disabled:opacity-50 hover:bg-app-elevated/45",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
