import { RefreshCcw, ShieldCheck, Store, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { FeatureSelect } from "../../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeatureToolbar,
} from "../../../components/ui/FeatureLayout";
import {
  FeatureEmptyState,
  FeatureStatusBadge,
} from "../../../components/ui/FeatureStates";
import { InviteMemberModal } from "../../settings/roles/InviteMemberModal";
import type {
  IdentityInvitationView,
  InviteStoreMemberInput,
  RoleManagementView,
} from "../../settings/types";
import type { AgencyTeamAccessDirectory } from "../teamAccessApiClient";

export type RosterMetrics = {
  activeCount: number;
  manageableCount: number;
  pendingCount: number;
  totalCount: number;
};

export function computeRosterMetrics(
  roles: RoleManagementView | null,
): RosterMetrics {
  if (!roles) {
    return {
      activeCount: 0,
      manageableCount: 0,
      pendingCount: 0,
      totalCount: 0,
    };
  }
  const activeCount = roles.memberships.filter(
    (membership) => membership.status === "active",
  ).length;
  const pendingCount = roles.pendingInvitations.length;
  const manageableCount = roles.memberships.filter(
    (membership) => membership.manageable,
  ).length;
  const totalCount = roles.memberships.length;
  return { activeCount, manageableCount, pendingCount, totalCount };
}

export function AgencyTeamAccessToolbar({
  directory,
  metrics,
  onStoreChange,
  selectedStoreId,
}: {
  directory: AgencyTeamAccessDirectory;
  metrics: RosterMetrics;
  onStoreChange: (storeId: string) => void;
  selectedStoreId: string;
}) {
  const options = directory.stores.map((store) => ({
    label: store.storeName,
    searchText: `${store.storeName} ${store.storeSlug}`,
    value: store.storeId,
  }));
  const selectedStore = directory.stores.find(
    (store) => store.storeId === selectedStoreId,
  );

  return (
    <FeatureToolbar className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <Store aria-hidden="true" className="size-4 shrink-0 text-muted" />
          <FeatureSelect
            ariaLabel="Loja selecionada"
            className="min-w-48 max-w-72"
            density="compact"
            emptyMessage="Nenhuma loja encontrada"
            onChange={onStoreChange}
            options={options}
            searchPlaceholder="Buscar loja..."
            searchable={options.length > 3}
            value={selectedStoreId}
          />
        </div>
        {selectedStore ? (
          <span className="truncate font-mono text-xs text-muted">
            {selectedStore.storeSlug}.lojaveiculos.com.br
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FeatureStatusBadge tone="neutral">
          {metrics.totalCount} {metrics.totalCount === 1 ? "membro" : "membros"}
        </FeatureStatusBadge>
        <FeatureStatusBadge tone="success">
          {metrics.activeCount} {metrics.activeCount === 1 ? "ativo" : "ativos"}
        </FeatureStatusBadge>
        {metrics.pendingCount > 0 ? (
          <FeatureStatusBadge tone="warning">
            {metrics.pendingCount}{" "}
            {metrics.pendingCount === 1
              ? "convite pendente"
              : "convites pendentes"}
          </FeatureStatusBadge>
        ) : null}
      </div>
    </FeatureToolbar>
  );
}

export function AgencyTeamAccessStaleBanner() {
  return (
    <div
      className="flex items-center gap-2 text-xs font-semibold text-muted"
      role="status"
    >
      <RefreshCcw aria-hidden="true" className="size-3.5 animate-spin" />
      <span>Atualizando acessos sem ocultar os dados anteriores...</span>
    </div>
  );
}

export function AgencyTeamAccessNoAgencyState() {
  return (
    <FeatureEmptyState
      body="Seu usuário não possui uma participação ativa em uma agência."
      icon={ShieldCheck}
      title="Acesso de agência necessário"
      tone="warning"
    />
  );
}

export function AgencyTeamAccessNoStoresState() {
  return (
    <FeatureEmptyState
      body="Cadastre ou vincule a primeira loja da agência para gerenciar os acessos da equipe."
      icon={Store}
      title="Nenhuma loja vinculada"
    />
  );
}

export function AgencyTeamAccessEmptyRosterState({
  onInvite,
  onResendInvitation,
  roles,
}: {
  onInvite: (input: InviteStoreMemberInput) => Promise<IdentityInvitationView>;
  onResendInvitation: (invitationId: string) => Promise<IdentityInvitationView>;
  roles: RoleManagementView;
}) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const availableRoles = roles.roles.flatMap((role) => {
    if (!role.assignable || !isInvitableRole(role.role)) return [];
    return [{ label: role.label, role: role.role }];
  });
  const canInvite = roles.actor.canManageRoles && availableRoles.length > 0;

  return (
    <>
      <FeatureEmptyState
        action={
          canInvite ? (
            <FeatureActionButton
              icon={UserPlus}
              label="Convidar primeiro membro"
              onClick={() => setIsInviteOpen(true)}
              variant="primary"
            />
          ) : undefined
        }
        body="Esta loja ainda não possui membros na equipe nem convites pendentes."
        icon={Users}
        title="Nenhum membro cadastrado"
      />
      <InviteMemberModal
        availableRoles={availableRoles}
        isOpen={isInviteOpen && canInvite}
        onClose={() => setIsInviteOpen(false)}
        onInvite={onInvite}
        onResendInvitation={onResendInvitation}
      />
    </>
  );
}

function isInvitableRole(
  role: RoleManagementView["roles"][number]["role"],
): role is InviteStoreMemberInput["role"] {
  return (
    role === "owner" ||
    role === "supervisor" ||
    role === "salesman" ||
    role === "investor"
  );
}
