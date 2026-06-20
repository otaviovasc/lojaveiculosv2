import type { PermissionGroup, RoleManagementView } from "../types";
import type { Draft, OverrideMode } from "./roleDraft";

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
    <div className="roles-permission-group">
      <h4>{group.label}</h4>
      <div className="roles-permission-grid">
        {group.permissions.map((permission) => {
          const mode = draft.overrides.get(permission.key) ?? "inherit";
          const enabled =
            mode === "allow" ||
            (mode === "inherit" && base.has(permission.key));
          return (
            <article className="roles-permission" key={permission.key}>
              <div>
                <strong>{permission.label}</strong>
                <small>{permission.description}</small>
              </div>
              <span className={enabled ? "roles-state is-on" : "roles-state"}>
                {enabled ? "Ativa" : "Bloqueada"}
              </span>
              <div className="roles-mode" role="group">
                {(["inherit", "allow", "deny"] as const).map((option) => (
                  <button
                    className={mode === option ? "is-active" : ""}
                    disabled={!editable}
                    key={option}
                    onClick={() => onModeChange(permission.key, option)}
                    type="button"
                  >
                    {modeLabel(option)}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function modeLabel(mode: OverrideMode) {
  return { allow: "Permitir", deny: "Negar", inherit: "Herdar" }[mode];
}
