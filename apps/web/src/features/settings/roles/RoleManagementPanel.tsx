import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FeatureSection } from "../../../components/ui/FeatureLayout";
import { FeatureLoadingState } from "../../../components/ui/FeatureStates";
import type {
  InviteStoreMemberInput,
  IdentityInvitationView,
  RoleKey,
  RoleManagementView,
} from "../types";
import { CustomRoleModal } from "./CustomRoleModal";
import { InviteMemberModal } from "./InviteMemberModal";
import { MembrosSidebar } from "./MembrosSidebar";
import type { CustomRolePreset } from "./RoleHelpers";
import {
  PermissionExceptionsSection,
  RoleAssignmentSection,
  RoleEditabilityBadge,
  RoleManagementFooter,
  RoleManagementTitle,
  RoleStatsBadges,
} from "./RoleManagementPanelSections";
import {
  createDraft,
  createOverrides,
  summarizeDraft,
  type OverrideMode,
} from "./roleDraft";
import { getRoleLabel } from "../settingsLabels";

export function RoleManagementPanel({
  isSaving,
  onInvite,
  onResendInvitation,
  onSave,
  roles,
}: {
  isSaving: boolean;
  onInvite: (input: InviteStoreMemberInput) => Promise<IdentityInvitationView>;
  onResendInvitation: (invitationId: string) => Promise<IdentityInvitationView>;
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
  const selected = roles.memberships.find((m) => m.membershipId === selectedId);
  const [draft, setDraft] = useState(() => createDraft(selected));
  const [customRoles, setCustomRoles] = useState<CustomRolePreset[]>([]);
  const [memberPresetMapping, setMemberPresetMapping] = useState<
    Record<string, string>
  >({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>(
    {
      inventory_marketplace: true,
    },
  );

  useEffect(() => {
    try {
      const r = localStorage.getItem("lojaveiculosv2:custom-roles");
      const m = localStorage.getItem("lojaveiculosv2:member-presets");
      if (r) setCustomRoles(JSON.parse(r));
      if (m) setMemberPresetMapping(JSON.parse(m));
    } catch {}
  }, []);

  useEffect(() => {
    if (!selected) setSelectedId(initialSelection(roles));
  }, [roles, selected]);
  useEffect(() => setDraft(createDraft(selected)), [selected]);

  const editable = Boolean(selected?.manageable && roles.actor.canManageRoles);
  const availableRoles = roles.roles.filter(
    (role) => role.assignable || role.role === selected?.role,
  );
  const stats = useMemo(() => summarizeDraft(draft, roles), [draft, roles]);
  const operationalRoles = availableRoles.filter((role) =>
    ["owner", "supervisor"].includes(role.role),
  );
  const frontlineRoles = availableRoles.filter((role) =>
    ["salesman"].includes(role.role),
  );
  const observationRoles = availableRoles.filter((role) =>
    ["investor", "agency"].includes(role.role),
  );
  const toggleBlock = (key: string) =>
    setExpandedBlocks((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!selected)
    return (
      <FeatureLoadingState className="settings-empty">
        Nenhum usuário encontrado
      </FeatureLoadingState>
    );

  const save = () =>
    onSave(selected.membershipId, {
      overrides: createOverrides(draft),
      role: draft.role,
    });

  const selectStandardRole = (roleKey: RoleKey) => {
    setDraft({ overrides: new Map(), role: roleKey });
    const next = { ...memberPresetMapping };
    delete next[selected.membershipId];
    setMemberPresetMapping(next);
    persistMemberPresets(next);
  };

  const selectCustomRole = (role: CustomRolePreset) => {
    const overrides = new Map<string, OverrideMode>();
    role.overrides.forEach((override) =>
      overrides.set(override.permission, override.allowed ? "allow" : "deny"),
    );
    const next = { ...memberPresetMapping, [selected.membershipId]: role.id };
    setDraft({ role: role.baseRole, overrides });
    setMemberPresetMapping(next);
    persistMemberPresets(next);
  };

  const handleCreateCustomRole = (name: string) => {
    const overridesList: { permission: string; allowed: boolean }[] = [];
    draft.overrides.forEach((value, key) =>
      overridesList.push({ permission: key, allowed: value === "allow" }),
    );
    const newRole: CustomRolePreset = {
      baseRole: draft.role,
      id: `custom_${Date.now()}`,
      name,
      overrides: overridesList,
    };
    const nextRoles = [...customRoles, newRole];
    const nextMap = {
      ...memberPresetMapping,
      [selected.membershipId]: newRole.id,
    };
    setCustomRoles(nextRoles);
    setMemberPresetMapping(nextMap);
    persistCustomRoles(nextRoles);
    persistMemberPresets(nextMap);
    setIsModalOpen(false);
  };

  const deleteCustomRole = (id: string) => {
    const nextRoles = customRoles.filter((role) => role.id !== id);
    const nextMap = { ...memberPresetMapping };
    Object.keys(nextMap).forEach((key) => {
      if (nextMap[key] === id) delete nextMap[key];
    });
    setCustomRoles(nextRoles);
    setMemberPresetMapping(nextMap);
    persistCustomRoles(nextRoles);
    persistMemberPresets(nextMap);
  };

  const isCustomRoleSelected = (role: CustomRolePreset) => {
    if (draft.role !== role.baseRole) return false;
    const draftOverrides = createOverrides(draft);
    if (draftOverrides.length !== role.overrides.length) return false;
    return role.overrides.every((override) => {
      const draftOverride = draftOverrides.find(
        (item) => item.permission === override.permission,
      );
      return draftOverride && draftOverride.allowed === override.allowed;
    });
  };

  const changePermissionMode = (permission: string, mode: OverrideMode) => {
    const overrides = new Map(draft.overrides);
    if (mode === "inherit") overrides.delete(permission);
    else overrides.set(permission, mode);
    setDraft({ ...draft, overrides });
  };
  const activePresetId = memberPresetMapping[selected.membershipId];
  const activePreset = customRoles.find((role) => role.id === activePresetId);
  const invitationRoles = roles.roles.flatMap((role) => {
    if (!role.assignable || !isInvitableRole(role.role)) return [];
    return [{ label: role.label, role: role.role }];
  });
  const canInviteMembers =
    roles.actor.canManageRoles && invitationRoles.length > 0;

  return (
    <section className="grid gap-6 md:grid-cols-[16rem_1fr] lg:grid-cols-[20rem_1fr] items-start !overflow-visible">
      <MembrosSidebar
        roles={roles}
        selected={selected}
        onSelectId={setSelectedId}
        memberPresetMapping={memberPresetMapping}
        customRoles={customRoles}
        roleLabel={roleLabel}
        canInvite={canInviteMembers}
        onInviteClick={() => setIsInviteOpen(true)}
        onSendInvitation={onResendInvitation}
      />
      <FeatureSection
        actions={<RoleEditabilityBadge editable={editable} />}
        className="flex flex-col md:h-[calc(100dvh-10rem)] overflow-hidden"
        headerClassName="p-5 border-b border-line shrink-0 w-full flex items-center justify-between gap-4"
        icon={<ShieldCheck className="size-5 text-accent-strong" />}
        padding="none"
        title={
          <RoleManagementTitle
            activePreset={activePreset}
            selected={selected}
          />
        }
      >
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <RoleStatsBadges stats={stats} />
          <RoleAssignmentSection
            activePresetId={activePresetId}
            customRoles={customRoles}
            draft={draft}
            editable={editable}
            frontlineRoles={frontlineRoles}
            isCustomRoleSelected={isCustomRoleSelected}
            observationRoles={observationRoles}
            onCreateCustomRoleClick={() => setIsModalOpen(true)}
            onDeleteCustomRole={deleteCustomRole}
            onSelectCustomRole={selectCustomRole}
            onSelectStandardRole={selectStandardRole}
            operationalRoles={operationalRoles}
            roleLabel={roleLabel}
            roles={roles}
          />
          <PermissionExceptionsSection
            draft={draft}
            editable={editable}
            expandedBlocks={expandedBlocks}
            onModeChange={changePermissionMode}
            onToggleBlock={toggleBlock}
            roles={roles}
          />
        </div>
        <RoleManagementFooter
          editable={editable}
          isSaving={isSaving}
          onSave={() => void save()}
        />
      </FeatureSection>
      <CustomRoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        baseRoleLabel={roleLabel(draft.role, roles)}
        exceptionsCount={stats.allowed + stats.denied}
        onCreate={handleCreateCustomRole}
      />
      <InviteMemberModal
        isOpen={isInviteOpen && canInviteMembers}
        onClose={() => setIsInviteOpen(false)}
        onInvite={onInvite}
        onResendInvitation={onResendInvitation}
        availableRoles={invitationRoles}
      />
    </section>
  );
}

function isInvitableRole(
  role: RoleKey,
): role is InviteStoreMemberInput["role"] {
  return (
    role === "owner" ||
    role === "supervisor" ||
    role === "salesman" ||
    role === "investor"
  );
}

function initialSelection(roles: RoleManagementView) {
  return (
    roles.memberships.find((membership) => membership.manageable)
      ?.membershipId ??
    roles.memberships[0]?.membershipId ??
    ""
  );
}

function persistCustomRoles(roles: CustomRolePreset[]) {
  try {
    localStorage.setItem("lojaveiculosv2:custom-roles", JSON.stringify(roles));
  } catch {}
}

function persistMemberPresets(mapping: Record<string, string>) {
  try {
    localStorage.setItem(
      "lojaveiculosv2:member-presets",
      JSON.stringify(mapping),
    );
  } catch {}
}

function roleLabel(role: RoleKey, roles: RoleManagementView) {
  return (
    roles.roles.find((item) => item.role === role)?.label ?? getRoleLabel(role)
  );
}
