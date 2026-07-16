import { RefreshCcw, Save, Store, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FeatureTabs } from "../../components/ui/FeatureControls";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { notifyTenantAdminBrandUpdated } from "../../app/tenantAdminBranding";
import type { SettingsApi } from "./apiClient";
import { RoleManagementPanel } from "./roles/RoleManagementPanel";
import { SettingsStoreProfilePanel } from "./SettingsStoreProfilePanel";
import { createRuntimeSettingsApi } from "./runtimeSettingsApi";
import { createStoreSettingsPatch } from "./settingsPatch";
import type {
  RoleManagementView,
  InviteStoreMemberInput,
  IdentityInvitationView,
  SettingsStatus,
  SettingsTab,
  StoreSettingsSnapshot,
  UpdateMembershipAccessInput,
} from "./types";

export function SettingsModule({
  api,
  initialTab,
}: {
  api?: SettingsApi;
  initialTab?: SettingsTab;
}) {
  const settingsApi = useMemo(() => api ?? createRuntimeSettingsApi(), [api]);
  const [settings, setSettings] = useState<StoreSettingsSnapshot | null>(null);
  const [roles, setRoles] = useState<RoleManagementView | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    () => initialTab ?? readInitialSettingsTab(),
  );
  const [status, setStatus] = useState<SettingsStatus>({ kind: "loading" });

  const refresh = async () => {
    setStatus({ kind: "loading" });
    setRolesError(null);
    const [settingsResult, rolesResult] = await Promise.allSettled([
      settingsApi.getStoreSettings(),
      settingsApi.getRoleManagement(),
    ]);

    if (rolesResult.status === "fulfilled") {
      setRoles(rolesResult.value);
    } else {
      setRoles(null);
      setRolesError(errorMessage(rolesResult.reason));
    }

    if (settingsResult.status === "fulfilled") {
      setSettings(settingsResult.value);
      setStatus({ kind: "ready" });
    } else {
      setStatus({
        kind: "error",
        message: errorMessage(settingsResult.reason),
      });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const save = async (next: StoreSettingsSnapshot) => {
    setStatus({ kind: "saving" });
    try {
      const saved = await settingsApi.updateStoreSettings(
        settings
          ? createStoreSettingsPatch(settings, next)
          : {
              identity: next.identity,
              profile: next.profile,
              publicSite: next.publicSite,
            },
      );
      setSettings(saved);
      notifyTenantAdminBrandUpdated(saved);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: errorMessage(error),
      });
    }
  };

  const saveMemberAccess = async (
    membershipId: string,
    input: UpdateMembershipAccessInput,
  ) => {
    setStatus({ kind: "saving" });
    try {
      setRoles(await settingsApi.updateMembershipAccess(membershipId, input));
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: errorMessage(error),
      });
    }
  };

  const inviteStoreMember = async (
    input: InviteStoreMemberInput,
  ): Promise<IdentityInvitationView> => {
    const invitation = await settingsApi.inviteStoreMember(input);
    await refresh();
    return invitation;
  };

  const resendInvitation = async (
    invitationId: string,
  ): Promise<IdentityInvitationView> => {
    const invitation = await settingsApi.resendInvitation(invitationId);
    await refresh();
    return invitation;
  };

  return (
    <FeaturePageShell
      className="settings-page-shell"
      mainClassName="!p-4 md:!p-6 !gap-4"
      variant="dashboard"
    >
      {status.kind === "error" &&
      (settings !== null || activeTab !== "store") ? (
        <FeatureAlert className="settings-alert">{status.message}</FeatureAlert>
      ) : null}

      <div className="settings-topbar my-2 flex flex-wrap items-center justify-between gap-3">
        <FeatureTabs
          activeClassName="!bg-accent !text-accent-foreground scale-[1.02]"
          ariaLabel="Áreas de configuração"
          className="settings-primary-tabs"
          onChange={(tab) => selectTab(tab, setActiveTab)}
          optionClassName="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-4 text-xs font-black text-muted transition-all hover:text-app-text"
          options={[
            { label: "Perfil da Loja", value: "store", icon: Store },
            { label: "Papéis e Permissões", value: "roles", icon: Users },
          ]}
          value={activeTab}
          variant="panel"
        />

        <button
          aria-label="Atualizar"
          aria-busy={status.kind === "loading" || undefined}
          className="settings-refresh-button inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line bg-panel/75 px-4 text-xs font-black text-app-text hover:bg-app-elevated/45 disabled:cursor-wait disabled:opacity-70"
          disabled={status.kind === "loading"}
          onClick={() => void refresh()}
          title="Atualizar configurações"
          type="button"
        >
          <RefreshCcw
            aria-hidden="true"
            className={`size-3.5 ${status.kind === "loading" ? "animate-spin" : ""}`}
          />
          <span>Atualizar</span>
        </button>
      </div>

      {activeTab === "store" && settings ? (
        <SettingsStoreProfilePanel
          isSaving={status.kind === "saving"}
          onSave={save}
          settings={settings}
        />
      ) : activeTab === "store" && status.kind === "error" ? (
        <FeatureEmptyState
          action={
            <button
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-panel px-4 text-xs font-black text-app-text hover:bg-app-elevated/45"
              onClick={() => void refresh()}
              type="button"
            >
              <RefreshCcw aria-hidden="true" className="size-3.5" />
              Tentar carregar novamente
            </button>
          }
          body="Os dados atuais não puderam ser carregados. Nenhuma alteração foi aplicada."
          icon={Store}
          title="Configurações indisponíveis"
        />
      ) : activeTab === "roles" && roles ? (
        <RoleManagementPanel
          isSaving={status.kind === "saving"}
          onInvite={inviteStoreMember}
          onResendInvitation={resendInvitation}
          onSave={saveMemberAccess}
          roles={roles}
        />
      ) : activeTab === "roles" && rolesError ? (
        <FeatureAlert className="settings-alert">{rolesError}</FeatureAlert>
      ) : (
        <FeatureLoadingState
          className="settings-empty"
          icon={activeTab === "roles" ? Users : Store}
          title="Carregando configurações"
        />
      )}

      {status.kind === "saved" ? (
        <p aria-live="polite" className="settings-saved" role="status">
          <Save aria-hidden="true" className="size-4" />
          Configurações salvas
        </p>
      ) : null}
    </FeaturePageShell>
  );
}

function readInitialSettingsTab(): SettingsTab {
  if (typeof window === "undefined") return "store";
  const query = window.location.hash.split("?")[1] ?? "";
  const tab = new URLSearchParams(query).get("tab");
  return tab === "roles" ? tab : "store";
}

function selectTab(tab: SettingsTab, setActiveTab: (tab: SettingsTab) => void) {
  setActiveTab(tab);
  if (typeof window === "undefined") return;
  window.location.hash = tab === "store" ? "/settings" : `/settings?tab=${tab}`;
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Não foi possível carregar as configurações.",
  );
}
