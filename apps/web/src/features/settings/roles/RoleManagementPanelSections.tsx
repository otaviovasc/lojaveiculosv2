import {
  ChevronDown,
  ChevronUp,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { FeatureFormSection } from "../../../components/ui/FeatureForms";
import type { RoleKey, RoleManagementView, RoleMemberView } from "../types";
import { CustomRoleCard, RoleCard } from "./RoleCards";
import { featureBlocks, type CustomRolePreset } from "./RoleHelpers";
import { PermissionGroupPanel } from "./PermissionGroupPanel";
import type { Draft, OverrideMode } from "./roleDraft";

type AvailableRole = RoleManagementView["roles"][number];
type RoleSummary = {
  active: number;
  allowed: number;
  denied: number;
};

export function RoleManagementTitle({
  activePreset,
  selected,
}: {
  activePreset: CustomRolePreset | undefined;
  selected: RoleMemberView;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-base font-black text-app-text">
        Controle de Acesso
      </span>
      <span className="text-xs font-bold text-muted">•</span>
      <span className="text-sm font-black text-accent">
        {selected.user.name ?? "Membro"}
      </span>
      <span className="text-xs font-bold text-muted">
        ({selected.user.email})
      </span>
      {activePreset && (
        <span className="inline-flex items-center rounded bg-accent-soft px-1.5 py-0.5 text-xs font-black uppercase text-accent-strong tracking-wider">
          {activePreset.name}
        </span>
      )}
    </div>
  );
}

export function RoleEditabilityBadge({ editable }: { editable: boolean }) {
  return editable ? (
    <span className="text-xs font-black uppercase tracking-wider text-emerald-500 bg-green-soft px-2.5 py-1 rounded-full shrink-0">
      Você pode editar este membro
    </span>
  ) : (
    <span className="text-xs font-black uppercase tracking-wider text-muted bg-line/40 px-2.5 py-1 rounded-full shrink-0">
      Apenas visualização
    </span>
  );
}

export function RoleStatsBadges({ stats }: { stats: RoleSummary }) {
  return (
    <div className="flex flex-wrap gap-2 py-1">
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-app border border-line text-xs font-black text-app-text shadow-sm">
        <Shield className="size-4 text-muted" />
        <span>{stats.active} Efetivas</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-soft text-xs font-black text-emerald-500 border border-emerald-500/10 shadow-sm">
        <ShieldCheck className="size-4" />
        <span>{stats.allowed} Liberadas manualmente</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-soft text-xs font-black text-danger border border-danger/10 shadow-sm">
        <ShieldAlert className="size-4" />
        <span>{stats.denied} Bloqueadas manualmente</span>
      </div>
    </div>
  );
}

export function RoleAssignmentSection({
  activePresetId,
  customRoles,
  draft,
  editable,
  frontlineRoles,
  isCustomRoleSelected,
  observationRoles,
  onCreateCustomRoleClick,
  onDeleteCustomRole,
  onSelectCustomRole,
  onSelectStandardRole,
  operationalRoles,
  roleLabel,
  roles,
}: {
  activePresetId: string | undefined;
  customRoles: CustomRolePreset[];
  draft: Draft;
  editable: boolean;
  frontlineRoles: AvailableRole[];
  isCustomRoleSelected: (role: CustomRolePreset) => boolean;
  observationRoles: AvailableRole[];
  onCreateCustomRoleClick: () => void;
  onDeleteCustomRole: (id: string) => void;
  onSelectCustomRole: (role: CustomRolePreset) => void;
  onSelectStandardRole: (role: RoleKey) => void;
  operationalRoles: AvailableRole[];
  roleLabel: (role: RoleKey, roles: RoleManagementView) => string;
  roles: RoleManagementView;
}) {
  const renderRoleGrid = (title: string, list: AvailableRole[]) => {
    if (list.length === 0) return null;
    return (
      <div className="flex flex-col gap-2">
        <h5 className="text-xs font-black uppercase tracking-wider text-accent mb-1">
          {title}
        </h5>
        <div className="flex flex-col gap-2 w-full">
          {list.map((role) => (
            <RoleCard
              key={role.role}
              label={role.label}
              description={role.description}
              isSelected={
                draft.role === role.role &&
                !activePresetId &&
                draft.overrides.size === 0
              }
              disabled={!editable}
              onClick={() => onSelectStandardRole(role.role)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <FeatureFormSection
      title="Cargo do Membro"
      description="Selecione o cargo para atribuir as permissões padrão deste membro na loja."
      actions={
        editable ? (
          <button
            type="button"
            onClick={onCreateCustomRoleClick}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent-soft px-3 text-xs font-black text-accent-strong transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Salvar como Cargo Customizado</span>
          </button>
        ) : null
      }
    >
      <div className="grid gap-6">
        <div>
          <h5 className="text-xs font-black uppercase tracking-wider text-accent mb-2">
            Cargos Customizados da Loja
          </h5>
          {customRoles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
              {customRoles.map((role) => (
                <CustomRoleCard
                  key={role.id}
                  role={role}
                  baseRoleLabel={roleLabel(role.baseRole, roles)}
                  isSelected={isCustomRoleSelected(role)}
                  disabled={!editable}
                  onSelect={() => onSelectCustomRole(role)}
                  onDelete={() => onDeleteCustomRole(role.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-line text-center bg-panel/10 col-span-full">
              <span className="text-xs font-bold text-muted">
                Nenhum cargo customizado cadastrado.
              </span>
              <p className="text-xs text-muted mt-1 leading-relaxed max-w-md">
                Ajuste as exceções de permissões abaixo e clique em{" "}
                <strong className="text-accent">
                  "Salvar como Cargo Customizado"
                </strong>{" "}
                no cabeçalho acima para criar um preset reutilizável.
              </p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start w-full border-t border-line/40 pt-4">
          {renderRoleGrid("Gestão Operacional", operationalRoles)}
          {renderRoleGrid("Atendimento e Vendas", frontlineRoles)}
          {renderRoleGrid("Acompanhamento e Parceiros", observationRoles)}
        </div>
      </div>
    </FeatureFormSection>
  );
}

export function PermissionExceptionsSection({
  draft,
  editable,
  expandedBlocks,
  onModeChange,
  onToggleBlock,
  roles,
}: {
  draft: Draft;
  editable: boolean;
  expandedBlocks: Record<string, boolean>;
  onModeChange: (permission: string, mode: OverrideMode) => void;
  onToggleBlock: (key: string) => void;
  roles: RoleManagementView;
}) {
  return (
    <FeatureFormSection
      title="Permissões Exclusivas (Exceções)"
      description="Ajuste permissões individuais se precisar liberar ou bloquear ações específicas além do cargo atribuído."
    >
      <div className="grid gap-4">
        {featureBlocks.map((block) => {
          const BlockIcon = block.icon;
          const isExpanded = expandedBlocks[block.key];
          const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;
          return (
            <div
              key={block.key}
              className="border border-line/45 rounded-xl overflow-hidden bg-panel/30"
            >
              <button
                type="button"
                onClick={() => onToggleBlock(block.key)}
                className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-app-elevated/45 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong shrink-0">
                    <BlockIcon className="size-4.5" />
                  </div>
                  <div>
                    <strong className="block text-sm font-black text-app-text">
                      {block.title}
                    </strong>
                    <span className="block text-xs font-bold text-muted mt-0.5">
                      {block.description}
                    </span>
                  </div>
                </div>
                <ChevronIcon className="size-5 text-muted shrink-0 transition-transform duration-300" />
              </button>
              {isExpanded && (
                <div className="p-4 bg-panel/10 border-t border-line/45 grid gap-6">
                  {roles.permissionGroups
                    .filter((group) => block.groups.includes(group.key))
                    .map((group) => (
                      <PermissionGroupPanel
                        draft={draft}
                        editable={editable}
                        group={group}
                        key={group.key}
                        roles={roles}
                        onModeChange={onModeChange}
                      />
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </FeatureFormSection>
  );
}

export function RoleManagementFooter({
  editable,
  isSaving,
  onSave,
}: {
  editable: boolean;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="shrink-0 p-4 border-t border-line/40 bg-panel/95 backdrop-blur-md flex items-center justify-end gap-3 rounded-b-xl shadow-md-up">
      <button
        className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-sm font-black text-accent-foreground disabled:opacity-70 transition-all hover:bg-accent-strong hover:text-accent-strong-foreground active:scale-98 cursor-pointer"
        disabled={!editable || isSaving}
        onClick={onSave}
        type="button"
      >
        <ShieldCheck aria-hidden="true" className="size-4" />
        {isSaving ? "Salvando..." : "Salvar Permissões"}
      </button>
    </div>
  );
}
