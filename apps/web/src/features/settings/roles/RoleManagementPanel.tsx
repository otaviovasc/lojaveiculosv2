import { ShieldCheck, UserCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  PermissionGroup,
  RoleKey,
  RoleManagementView,
  RoleMemberView,
} from "../types";

export function RoleManagementPanel({
  isSaving,
  onSave,
  roles,
}: {
  isSaving: boolean;
  onSave: (
    membershipId: string,
    input: {
      overrides: { allowed: boolean; permission: string }[];
      role: RoleKey;
    },
  ) => Promise<void>;
  roles: RoleManagementView;
}) {
  const [selectedId, setSelectedId] = useState(
    roles.memberships.find((member) => member.manageable)?.membershipId ??
      roles.memberships[0]?.membershipId ??
      "",
  );
  const selected = roles.memberships.find(
    (member) => member.membershipId === selectedId,
  );
  const [draft, setDraft] = useState(() => createDraft(selected, roles));

  useEffect(() => {
    setDraft(createDraft(selected, roles));
  }, [roles, selected]);

  const editable = Boolean(selected?.manageable && roles.actor.canManageRoles);
  const permissionCount = useMemo(
    () =>
      roles.permissionGroups.reduce(
        (total, group) => total + group.permissions.length,
        0,
      ),
    [roles.permissionGroups],
  );

  if (!selected) {
    return (
      <section className="settings-empty">Nenhum usuario encontrado</section>
    );
  }

  const save = () =>
    onSave(selected.membershipId, {
      overrides: createOverrides(draft, roles),
      role: draft.role,
    });

  return (
    <section className="roles-layout">
      <aside className="roles-sidebar">
        <div className="settings-panel-title">
          <UserCog aria-hidden="true" className="size-5" />
          <h3>Usuarios</h3>
        </div>
        {roles.memberships.map((member) => (
          <button
            className={
              member.membershipId === selected.membershipId
                ? "roles-user is-active"
                : "roles-user"
            }
            key={member.membershipId}
            onClick={() => {
              setSelectedId(member.membershipId);
              setDraft(createDraft(member, roles));
            }}
            type="button"
          >
            <strong>{member.user.name ?? member.user.email}</strong>
            <span>{member.role}</span>
          </button>
        ))}
      </aside>

      <section className="roles-editor">
        <div className="roles-editor-head">
          <div>
            <p>{selected.user.email}</p>
            <h3>{selected.user.name ?? selected.user.email}</h3>
          </div>
          <select
            disabled={!editable}
            onChange={(event) =>
              setDraft(createRoleDraft(event.target.value as RoleKey, roles))
            }
            value={draft.role}
          >
            {roles.roles
              .filter((role) => role.role !== "agency")
              .map((role) => (
                <option key={role.role} value={role.role}>
                  {role.label}
                </option>
              ))}
          </select>
        </div>

        <div className="roles-summary">
          <span>{permissionCount} permissoes mapeadas</span>
          <span>{draft.permissions.size} ativas para este usuario</span>
        </div>

        {roles.permissionGroups.map((group) => (
          <PermissionGroupPanel
            draft={draft}
            editable={editable}
            group={group}
            key={group.key}
            onToggle={(permission) => {
              const permissions = new Set(draft.permissions);
              if (permissions.has(permission)) permissions.delete(permission);
              else permissions.add(permission);
              setDraft({ ...draft, permissions });
            }}
          />
        ))}

        <button
          className="settings-save"
          disabled={!editable || isSaving}
          onClick={() => void save()}
          type="button"
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          {isSaving ? "Salvando" : "Salvar papeis"}
        </button>
      </section>
    </section>
  );
}

type Draft = {
  permissions: Set<string>;
  role: RoleKey;
};

function PermissionGroupPanel({
  draft,
  editable,
  group,
  onToggle,
}: {
  draft: Draft;
  editable: boolean;
  group: PermissionGroup;
  onToggle: (permission: string) => void;
}) {
  return (
    <div className="roles-permission-group">
      <h4>{group.label}</h4>
      <div className="roles-permission-grid">
        {group.permissions.map((permission) => (
          <label className="roles-permission" key={permission.key}>
            <input
              checked={draft.permissions.has(permission.key)}
              disabled={!editable}
              onChange={() => onToggle(permission.key)}
              type="checkbox"
            />
            <span>
              <strong>{permission.label}</strong>
              <small>{permission.description}</small>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function createDraft(
  member: RoleMemberView | undefined,
  roles: RoleManagementView,
): Draft {
  return member
    ? { permissions: new Set(member.effectivePermissions), role: member.role }
    : createRoleDraft("salesman", roles);
}

function createRoleDraft(role: RoleKey, roles: RoleManagementView): Draft {
  const template = roles.roles.find((item) => item.role === role);
  return {
    permissions: new Set(template?.defaultPermissions ?? []),
    role,
  };
}

function createOverrides(draft: Draft, roles: RoleManagementView) {
  const base = new Set(
    roles.roles.find((role) => role.role === draft.role)?.defaultPermissions ??
      [],
  );
  return roles.permissionGroups
    .flatMap((group) => group.permissions.map((permission) => permission.key))
    .filter(
      (permission) =>
        base.has(permission) !== draft.permissions.has(permission),
    )
    .map((permission) => ({
      allowed: draft.permissions.has(permission),
      permission,
    }));
}
