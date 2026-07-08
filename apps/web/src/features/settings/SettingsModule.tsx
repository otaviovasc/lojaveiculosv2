import { RefreshCcw, Save, Store, Users, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FeatureTabs } from "../../components/ui/FeatureControls";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { StorefrontCustomizationModule } from "../publicSite/StorefrontCustomizationModule";
import { notifyTenantAdminBrandUpdated } from "../../app/tenantAdminBranding";
import { createSettingsApi, type SettingsApi } from "./apiClient";
import { RoleManagementPanel } from "./roles/RoleManagementPanel";
import { SettingsStoreProfilePanel } from "./SettingsStoreProfilePanel";
import { createSettingsApiOptions } from "./runtimeApi";
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
    <FeaturePageShell variant="dashboard" mainClassName="!p-4 md:!p-6 !gap-4">
      {status.kind === "error" ? (
        <FeatureAlert className="settings-alert">{status.message}</FeatureAlert>
      ) : null}

      <div className="flex items-center justify-between my-2">
        <FeatureTabs
          ariaLabel="Áreas de configuração"
          onChange={(tab) => selectTab(tab, setActiveTab)}
          options={[
            { label: "Perfil da Loja", value: "store", icon: Store },
            { label: "Vitrine Digital", value: "storefront", icon: Wand2 },
            { label: "Papéis e Permissões", value: "roles", icon: Users },
          ]}
          value={activeTab}
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-panel/75 backdrop-blur-md border border-line/60 shadow-sm"
          optionClassName="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-black transition-all cursor-pointer text-muted hover:text-app-text"
          activeClassName="!bg-accent !text-inverse shadow-sm scale-[1.02]"
        />

        <button
          onClick={() => void refresh()}
          type="button"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-panel/75 px-4 text-xs font-black text-app-text hover:bg-app-elevated/45 cursor-pointer shadow-sm"
        >
          <RefreshCcw className="size-3.5" />
          <span>Atualizar</span>
        </button>
      </div>

      {activeTab === "store" && settings ? (
        <SettingsStoreProfilePanel
          isSaving={status.kind === "saving"}
          onSave={save}
          settings={settings}
        />
      ) : activeTab === "storefront" ? (
        <div className="-mx-4 -mb-6 md:-mx-6">
          <StorefrontCustomizationModule initialTab="design" />
        </div>
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
          icon={Wand2}
          title="Carregando configurações"
        />
      )}

      {status.kind === "saved" ? (
        <p className="settings-saved">
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
  return tab === "roles" || tab === "storefront" ? tab : "store";
}

function selectTab(tab: SettingsTab, setActiveTab: (tab: SettingsTab) => void) {
  setActiveTab(tab);
  if (typeof window === "undefined") return;
  window.location.hash = tab === "store" ? "/settings" : `/settings?tab=${tab}`;
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Nao foi possivel carregar as configuracoes.",
  );
}

function createRuntimeSettingsApi(): SettingsApi {
  return {
    getStoreSettings: async () =>
      createSettingsApi(await createSettingsApiOptions()).getStoreSettings(),
    getRoleManagement: async () =>
      createSettingsApi(await createSettingsApiOptions()).getRoleManagement(),
    inviteStoreMember: async (input) =>
      createSettingsApi(await createSettingsApiOptions()).inviteStoreMember(
        input,
      ),
    resendInvitation: async (invitationId) =>
      createSettingsApi(await createSettingsApiOptions()).resendInvitation(
        invitationId,
      ),
    updateMembershipAccess: async (membershipId, input) =>
      createSettingsApi(
        await createSettingsApiOptions(),
      ).updateMembershipAccess(membershipId, input),
    updateStoreSettings: async (input) =>
      createSettingsApi(await createSettingsApiOptions()).updateStoreSettings(
        input,
      ),
  };
}
