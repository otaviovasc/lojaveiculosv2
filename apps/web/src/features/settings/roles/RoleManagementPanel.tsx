import { ShieldCheck, UserCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import type { RoleKey, RoleManagementView } from "../types";
import { PermissionGroupPanel } from "./PermissionGroupPanel";
import type { OverrideMode } from "./roleDraft";
import { createDraft, createOverrides, summarizeDraft } from "./roleDraft";

export function RoleManagementPanel({
  isSaving,
  onSave,
  roles,
}: {
  isSaving: boolean;
  onSave: (
    membershipId: string,
    input: {
      overrides: { allowed: boolean; permission: string; reason: string }[];
      role: RoleKey;
    },
  ) => Promise<void>;
  roles: RoleManagementView;
}) {
  const [selectedId, setSelectedId] = useState(initialSelection(roles));
  const selected = roles.memberships.find(
    (member) => member.membershipId === selectedId,
  );
  const [draft, setDraft] = useState(() => createDraft(selected));

  useEffect(() => {
    if (!selected) setSelectedId(initialSelection(roles));
  }, [roles, selected]);
  useEffect(() => setDraft(createDraft(selected)), [selected]);

  const editable = Boolean(selected?.manageable && roles.actor.canManageRoles);
  const availableRoles = roles.roles.filter(
    (role) => role.assignable || role.role === selected?.role,
  );
  const stats = useMemo(() => summarizeDraft(draft, roles), [draft, roles]);

  if (!selected)
    return (
      <section className="settings-empty">Nenhum usuario encontrado</section>
    );

  const save = () =>
    onSave(selected.membershipId, {
      overrides: createOverrides(draft),
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
            onClick={() => setSelectedId(member.membershipId)}
            type="button"
          >
            <strong>{member.user.name ?? member.user.email}</strong>
            <span>{roleLabel(member.role, roles)}</span>
            <small>{member.manageable ? "Editavel" : "Protegido"}</small>
          </button>
        ))}
      </aside>

      <section className="roles-editor">
        <div className="roles-editor-head">
          <div>
            <p>{selected.user.email}</p>
            <h3>{selected.user.name ?? selected.user.email}</h3>
          </div>
          <CustomSelect
            disabled={!editable}
            onChange={(role) =>
              setDraft({
                overrides: new Map(),
                role,
              })
            }
            options={availableRoles.map((role) => ({
              label: role.label,
              value: role.role,
            }))}
            value={draft.role}
          />
        </div>

        <div className="roles-summary">
          <span>{stats.active} permissoes efetivas</span>
          <span>{stats.allowed} liberadas manualmente</span>
          <span>{stats.denied} bloqueadas manualmente</span>
        </div>

        {roles.roles.find((role) => role.role === draft.role) ? (
          <p className="roles-role-note">
            {roles.roles.find((role) => role.role === draft.role)?.description}
          </p>
        ) : null}

        {roles.permissionGroups.map((group) => (
          <PermissionGroupPanel
            draft={draft}
            editable={editable}
            group={group}
            key={group.key}
            roles={roles}
            onModeChange={(permission, mode) => {
              const overrides = new Map(draft.overrides);
              if (mode === "inherit") overrides.delete(permission);
              else overrides.set(permission, mode);
              setDraft({ ...draft, overrides });
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
          {isSaving ? "Salvando" : "Salvar permissoes exatas"}
        </button>
      </section>
    </section>
  );
}

function initialSelection(roles: RoleManagementView) {
  return (
    roles.memberships.find((member) => member.manageable)?.membershipId ??
    roles.memberships[0]?.membershipId ??
    ""
  );
}

function roleLabel(role: RoleKey, roles: RoleManagementView) {
  return roles.roles.find((item) => item.role === role)?.label ?? role;
}
