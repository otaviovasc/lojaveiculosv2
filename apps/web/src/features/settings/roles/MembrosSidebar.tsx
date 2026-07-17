import type { RoleKey, RoleManagementView, RoleMemberView } from "../types";
import { getRoleVisual, type CustomRolePreset } from "./RoleHelpers";
import { UserCog, UserPlus } from "lucide-react";
import {
  FeatureCard,
  FeatureCardHeader,
  FeatureCardTitle,
  FeatureCardDescription,
  FeatureList,
  FeatureListItemButton,
} from "../../../components/ui/FeatureCards";
import { cx } from "../../../components/ui/featureShared";

export function MembrosSidebar({
  roles,
  selected,
  onSelectId,
  memberPresetMapping,
  customRoles,
  roleLabel,
  canInvite,
  onInviteClick,
}: {
  roles: RoleManagementView;
  selected: RoleMemberView;
  onSelectId: (id: string) => void;
  memberPresetMapping: Record<string, string>;
  customRoles: CustomRolePreset[];
  roleLabel: (role: RoleKey, roles: RoleManagementView) => string;
  canInvite: boolean;
  onInviteClick: () => void;
}) {
  return (
    <FeatureCard
      className="flex flex-col md:h-[calc(100dvh-10rem)] overflow-hidden"
      padding="compact"
    >
      <FeatureCardHeader
        icon={<UserCog className="size-5 text-accent-strong" />}
        className="mb-4"
      >
        <FeatureCardTitle>Membros</FeatureCardTitle>
        <FeatureCardDescription>
          Selecione um usuário para gerenciar permissões.
        </FeatureCardDescription>
      </FeatureCardHeader>

      <FeatureList className="flex-1 overflow-y-auto mt-2" inset="scroll">
        {roles.memberships.map((member) => {
          const active = member.membershipId === selected.membershipId;
          const presetId = memberPresetMapping[member.membershipId];
          const preset = customRoles.find((cr) => cr.id === presetId);
          const label = preset ? preset.name : roleLabel(member.role, roles);
          const visual = getRoleVisual(member.role);
          const RoleIcon = visual.icon;

          return (
            <FeatureListItemButton
              key={member.membershipId}
              active={active}
              density="comfortable"
              onClick={() => onSelectId(member.membershipId)}
              className={cx(
                "relative overflow-hidden group border transition-all duration-300 hover:bg-app-elevated/40 hover:border-line-strong cursor-pointer flex items-center gap-3",
                active
                  ? "border-accent bg-accent-soft/30 border-l-[4px] border-l-accent"
                  : "border-line bg-panel/20",
              )}
            >
              <div
                className={cx(
                  "flex size-9 items-center justify-center rounded-full shrink-0 transition-transform duration-300 group-hover:scale-105",
                  visual.tile,
                )}
              >
                <RoleIcon className="size-4.5" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <strong className="block text-sm font-black text-app-text group-hover:text-accent transition-colors truncate">
                  {member.user.name ?? member.user.email}
                </strong>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cx(
                      "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-black uppercase tracking-wider",
                      preset
                        ? "bg-accent-soft text-accent-strong"
                        : visual.chip,
                    )}
                  >
                    {label}
                  </span>
                  <span
                    className={cx(
                      "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-black uppercase tracking-wider",
                      member.manageable
                        ? "bg-green-soft text-emerald-500"
                        : "bg-line/50 text-muted",
                    )}
                  >
                    {member.manageable ? "Editável" : "Protegido"}
                  </span>
                </div>
              </div>
            </FeatureListItemButton>
          );
        })}
        {roles.pendingInvitations.length ? (
          <span className="px-1 pt-1 text-xs font-black uppercase tracking-wider text-muted">
            Convites pendentes
          </span>
        ) : null}
        {roles.pendingInvitations.map((invitation) => {
          const inviteVisual = getRoleVisual(invitation.role);
          return (
            <div
              key={invitation.id}
              className="relative flex items-center gap-3 overflow-hidden rounded-lg border border-dashed border-line bg-app-elevated/35 p-3.5 opacity-90"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-line/50 text-muted">
                <UserPlus className="size-4.5" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <strong className="block truncate text-sm font-black text-app-text">
                  {invitation.name ?? invitation.email}
                </strong>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cx(
                      "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-black uppercase tracking-wider",
                      inviteVisual.chip,
                    )}
                  >
                    {roleLabel(invitation.role, roles)}
                  </span>
                  <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-black uppercase tracking-wider text-amber-600">
                    Pendente
                  </span>
                </div>
                {invitation.name ? (
                  <span className="block truncate text-xs font-bold text-muted">
                    {invitation.email}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </FeatureList>

      <div className="shrink-0 pt-4 border-t border-line/45 mt-2">
        <button
          type="button"
          disabled={!canInvite}
          onClick={onInviteClick}
          title={
            canInvite
              ? "Convidar novo membro"
              : "Sem permissão para convidar membros"
          }
          className={cx(
            "w-full flex h-10 items-center justify-center gap-2 rounded-lg bg-accent text-xs font-black text-accent-foreground transition-all hover:bg-accent-strong hover:text-accent-strong-foreground active:scale-98",
            canInvite
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-50 hover:bg-accent",
          )}
        >
          <UserPlus className="size-4" />
          <span>Convidar Novo Membro</span>
        </button>
      </div>
    </FeatureCard>
  );
}
