import { RefreshCcw, Users } from "lucide-react";
import { useMemo } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../../components/ui/FeatureStates";
import { RoleManagementPanel } from "../../settings/roles/RoleManagementPanel";
import type { AgencyTeamAccessApi } from "../teamAccessApiClient";
import { AgencyTenantSelector } from "../useAgencyTenantSelection";
import {
  AgencyTeamAccessEmptyRosterState,
  AgencyTeamAccessNoAgencyState,
  AgencyTeamAccessNoStoresState,
  AgencyTeamAccessStaleBanner,
  AgencyTeamAccessToolbar,
  computeRosterMetrics,
} from "./AgencyTeamAccessParts";
import { useAgencyTeamAccessPage } from "./useAgencyTeamAccessPage";

export function AgencyTeamAccessPage({
  api,
}: {
  api?: AgencyTeamAccessApi | undefined;
}) {
  const {
    agencyTenant,
    agencyTenants,
    directory,
    error,
    handleInviteMember,
    handleResendInvitation,
    handleSaveMemberAccess,
    isSaving,
    loading,
    refresh,
    refreshing,
    roles,
    selectAgencyTenant,
    selectedStore,
    selectedStoreId,
    selectStore,
  } = useAgencyTeamAccessPage({ api });

  const metrics = useMemo(() => computeRosterMetrics(roles), [roles]);

  return (
    <FeaturePageShell className="agency-team-access-shell" variant="content">
      <FeaturePageHeader
        actions={
          <>
            <AgencyTenantSelector
              agencyTenant={agencyTenant}
              agencyTenants={agencyTenants}
              onChange={selectAgencyTenant}
            />
            <FeatureActionButton
              icon={RefreshCcw}
              isBusy={loading || refreshing}
              label="Atualizar"
              onClick={() => void refresh()}
            />
          </>
        }
        chip={
          selectedStore
            ? `${selectedStore.storeName} · ${metrics.totalCount} ${metrics.totalCount === 1 ? "membro" : "membros"}`
            : undefined
        }
        description="Gerencie os papéis, permissões e convites dos colaboradores vinculados a cada loja da rede."
        eyebrow={
          <>
            <Users aria-hidden="true" className="size-4" />
            Equipe e governança
          </>
        }
        title="Acessos de equipe"
      />

      {error ? <FeatureAlert tone="danger">{error}</FeatureAlert> : null}

      {refreshing && roles ? <AgencyTeamAccessStaleBanner /> : null}

      {!agencyTenant ? (
        <AgencyTeamAccessNoAgencyState />
      ) : loading && !directory ? (
        <FeatureLoadingState title="Carregando acessos da equipe">
          Sincronizando lojas vinculadas e permissões dos colaboradores.
        </FeatureLoadingState>
      ) : directory && directory.stores.length === 0 ? (
        <AgencyTeamAccessNoStoresState />
      ) : loading && !roles ? (
        <FeatureLoadingState title="Carregando permissões da loja">
          Buscando o catálogo de papéis e colaboradores da loja selecionada.
        </FeatureLoadingState>
      ) : directory && roles && selectedStoreId ? (
        <div className="space-y-6">
          <AgencyTeamAccessToolbar
            directory={directory}
            metrics={metrics}
            onStoreChange={(storeId) => void selectStore(storeId)}
            selectedStoreId={selectedStoreId}
          />
          {roles.memberships.length === 0 &&
          roles.pendingInvitations.length === 0 ? (
            <AgencyTeamAccessEmptyRosterState
              onInvite={handleInviteMember}
              onResendInvitation={handleResendInvitation}
              roles={roles}
            />
          ) : (
            <RoleManagementPanel
              key={selectedStoreId}
              isSaving={isSaving}
              onInvite={handleInviteMember}
              onResendInvitation={handleResendInvitation}
              onSave={handleSaveMemberAccess}
              roles={roles}
            />
          )}
        </div>
      ) : null}
    </FeaturePageShell>
  );
}
