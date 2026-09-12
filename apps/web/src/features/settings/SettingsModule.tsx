import { Bell, RefreshCcw, Save, Store, Users, Globe2 } from "lucide-react";
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
import { useOptionalAccountSession } from "../account/accountSession";
import { readSessionActiveStore } from "../account/sessionPermissions";
import { CrmPushSettingsCard } from "../crm/push/CrmPushSettingsCard";
import { useCrmPush } from "../crm/push/CrmPushProvider";
import type { SettingsApi } from "./apiClient";
import { RoleManagementPanel } from "./roles/RoleManagementPanel";
import { SettingsDomainPanel } from "./SettingsDomainPanel";
import { SettingsStoreProfilePanel } from "./SettingsStoreProfilePanel";
import { createRuntimeSettingsApi } from "./runtimeSettingsApi";
import { createStoreSettingsPatch } from "./settingsPatch";
import type {
  RoleManagementView,
  InviteStoreMemberInput,
  IdentityInvitationView,
  SettingsAccess,
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
  const crmPush = useCrmPush();
  const accountSession = useOptionalAccountSession();
  const access = readSettingsAccess(accountSession);
  const [settings, setSettings] = useState<StoreSettingsSnapshot | null>(null);
  const [roles, setRoles] = useState<RoleManagementView | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>(() =>
    resolveAllowedSettingsTab(
      initialTab ?? readInitialSettingsTab(),
      access,
      crmPush.available,
    ),
  );
  const [status, setStatus] = useState<SettingsStatus>({ kind: "loading" });

  const refresh = async () => {
    setStatus({ kind: "loading" });
    setRolesError(null);
    const [settingsResult, rolesResult] = await Promise.allSettled([
      access.store || access.domain
        ? settingsApi.getStoreSettings()
        : Promise.resolve(null),
      access.roles ? settingsApi.getRoleManagement() : Promise.resolve(null),
    ]);

    if (rolesResult.status === "fulfilled" && rolesResult.value) {
      setRoles(rolesResult.value);
    } else if (rolesResult.status === "rejected") {
      setRoles(null);
      setRolesError(errorMessage(rolesResult.reason));
    }

    if (settingsResult.status === "fulfilled" && settingsResult.value) {
      setSettings(settingsResult.value);
      setStatus({ kind: "ready" });
    } else if (settingsResult.status === "rejected") {
      setStatus({
        kind: "error",
        message: errorMessage(settingsResult.reason),
      });
    } else {
      setStatus({ kind: "ready" });
    }
  };

  useEffect(() => {
    if (access.store || access.domain || access.roles) void refresh();
    else setStatus({ kind: "ready" });
  }, []);

  useEffect(() => {
    setActiveTab((current) =>
      resolveAllowedSettingsTab(
        initialTab ?? current,
        access,
        crmPush.available,
      ),
    );
  }, [
    access.domain,
    access.roles,
    access.store,
    crmPush.available,
    initialTab,
  ]);

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
      activeTab !== "notifications" &&
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
            ...(access.store
              ? [
                  {
                    label: "Perfil da Loja",
                    value: "store" as const,
                    icon: Store,
                  },
                ]
              : []),
            ...(access.domain
              ? [{ label: "Domínio", value: "domain" as const, icon: Globe2 }]
              : []),
            ...(access.roles
              ? [
                  {
                    label: "Papéis e Permissões",
                    value: "roles" as const,
                    icon: Users,
                  },
                ]
              : []),
            ...(crmPush.available
              ? [
                  {
                    label: "Notificações",
                    value: "notifications" as const,
                    icon: Bell,
                  },
                ]
              : []),
          ]}
          value={activeTab}
          variant="panel"
        />

        <button
          aria-label="Atualizar"
          aria-busy={status.kind === "loading" || undefined}
          className="settings-refresh-button inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line bg-panel/75 px-4 text-xs font-black text-app-text hover:bg-app-elevated/45 disabled:cursor-wait disabled:opacity-70"
          disabled={
            activeTab === "notifications"
              ? crmPush.status === "saving" || crmPush.status === "requesting"
              : status.kind === "loading"
          }
          onClick={() =>
            void (activeTab === "notifications" ? crmPush.refresh() : refresh())
          }
          title="Atualizar configurações"
          type="button"
        >
          <RefreshCcw
            aria-hidden="true"
            className={`size-3.5 ${
              (activeTab === "notifications" &&
                (crmPush.status === "saving" ||
                  crmPush.status === "requesting")) ||
              (activeTab !== "notifications" && status.kind === "loading")
                ? "animate-spin"
                : ""
            }`}
          />
          <span>Atualizar</span>
        </button>
      </div>

      {activeTab === "notifications" ? (
        <CrmPushSettingsCard />
      ) : activeTab === "store" && settings ? (
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
      ) : activeTab === "domain" && settings ? (
        <SettingsDomainPanel
          isSaving={status.kind === "saving"}
          onSave={save}
          settings={settings}
        />
      ) : activeTab === "domain" && status.kind === "error" ? (
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
          icon={Globe2}
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
          icon={
            activeTab === "roles"
              ? Users
              : activeTab === "domain"
                ? Globe2
                : Store
          }
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
  return tab === "roles" || tab === "domain" || tab === "notifications"
    ? tab
    : "store";
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

function readSettingsAccess(
  session: ReturnType<typeof useOptionalAccountSession>,
): SettingsAccess {
  if (!session) return { domain: true, roles: true, store: true };
  const store = readSessionActiveStore(session);
  const allows = (permission: string) =>
    Boolean(
      store &&
      (store.role === "agency" ||
        store.effectivePermissions?.includes(permission)),
    );
  return {
    domain: allows("store_public_site.manage"),
    roles: allows("users.manage"),
    store: allows("store_profile.manage"),
  };
}

function resolveAllowedSettingsTab(
  requested: SettingsTab,
  access: SettingsAccess,
  notificationsAvailable: boolean,
): SettingsTab {
  if (requested === "store" && access.store) return requested;
  if (requested === "domain" && access.domain) return requested;
  if (requested === "roles" && access.roles) return requested;
  if (requested === "notifications" && notificationsAvailable) return requested;
  if (
    notificationsAvailable &&
    !access.store &&
    !access.domain &&
    !access.roles
  ) {
    return "notifications";
  }
  if (access.store) return "store";
  if (access.domain) return "domain";
  if (access.roles) return "roles";
  return "notifications";
}
