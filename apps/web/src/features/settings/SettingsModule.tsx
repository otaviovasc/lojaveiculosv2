import { Globe2, RefreshCcw, Save, Store, Users, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FeatureTabs } from "../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { createSettingsApi, type SettingsApi } from "./apiClient";
import { RoleManagementPanel } from "./roles/RoleManagementPanel";
import { SettingsForm } from "./SettingsPanels";
import { createSettingsApiOptions } from "./runtimeApi";
import { createStoreSettingsPatch } from "./settingsPatch";
import type {
  RoleManagementView,
  SettingsStatus,
  SettingsTab,
  StoreSettingsSnapshot,
  UpdateMembershipAccessInput,
} from "./types";

export function SettingsModule({ api }: { api?: SettingsApi }) {
  const settingsApi = useMemo(() => api ?? createRuntimeSettingsApi(), [api]);
  const [settings, setSettings] = useState<StoreSettingsSnapshot | null>(null);
  const [roles, setRoles] = useState<RoleManagementView | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    readInitialSettingsTab,
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
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
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
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <FeaturePageShell variant="plain">
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            label="Atualizar"
            onClick={() => void refresh()}
          />
        }
        description="Identidade, contato, WhatsApp, SEO, publicacao e dominio ficam em um cadastro auditavel para alimentar vitrine, documentos e acessos."
        eyebrow={
          <>
            <Store aria-hidden="true" className="size-4" />
            Loja
            <Globe2 aria-hidden="true" className="size-4" />
            Site publico
            <Users aria-hidden="true" className="size-4" />
            Papeis
          </>
        }
        title="Configuracoes operacionais da loja"
      />

      {status.kind === "error" ? (
        <FeatureAlert className="settings-alert">{status.message}</FeatureAlert>
      ) : null}

      <FeatureTabs
        ariaLabel="Areas de configuracao"
        onChange={(tab) => selectTab(tab, setActiveTab)}
        options={[
          { label: "Loja", value: "store" },
          { label: "Papeis", value: "roles" },
        ]}
        value={activeTab}
      />

      {activeTab === "store" && settings ? (
        <SettingsForm
          isSaving={status.kind === "saving"}
          onSave={save}
          settings={settings}
        />
      ) : activeTab === "roles" && roles ? (
        <RoleManagementPanel
          isSaving={status.kind === "saving"}
          onSave={saveMemberAccess}
          roles={roles}
        />
      ) : activeTab === "roles" && rolesError ? (
        <FeatureAlert className="settings-alert">{rolesError}</FeatureAlert>
      ) : (
        <FeatureLoadingState
          className="settings-empty"
          icon={Wand2}
          title="Carregando configuracoes"
        />
      )}

      {status.kind === "saved" ? (
        <p className="settings-saved">
          <Save aria-hidden="true" className="size-4" />
          Configuracoes salvas
        </p>
      ) : null}
    </FeaturePageShell>
  );
}

function readInitialSettingsTab(): SettingsTab {
  if (typeof window === "undefined") return "store";
  const query = window.location.hash.split("?")[1] ?? "";
  return new URLSearchParams(query).get("tab") === "roles" ? "roles" : "store";
}

function selectTab(tab: SettingsTab, setActiveTab: (tab: SettingsTab) => void) {
  setActiveTab(tab);
  if (typeof window === "undefined") return;
  window.location.hash = tab === "roles" ? "/settings?tab=roles" : "/settings";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function createRuntimeSettingsApi(): SettingsApi {
  return {
    getStoreSettings: async () =>
      createSettingsApi(await createSettingsApiOptions()).getStoreSettings(),
    getRoleManagement: async () =>
      createSettingsApi(await createSettingsApiOptions()).getRoleManagement(),
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
