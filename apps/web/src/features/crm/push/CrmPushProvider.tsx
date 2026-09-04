import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useOptionalAccountSession } from "../../account/accountSession";
import { readSessionActiveStore } from "../../account/sessionPermissions";
import { hasCrmPermission } from "../crmPermissions";
import type { CrmPushApi } from "./apiClient";
import {
  cleanupCrmPushSubscription,
  registerCrmPushLogoutCleanup,
} from "./logoutCleanup";
import { oneSignalBrowser } from "./oneSignalRuntime";
import { createRuntimeCrmPushApi } from "./runtimeApi";
import type { CrmPushBrowser, CrmPushView } from "./types";
import { useCrmPushNotifications } from "./useCrmPushNotifications";

const unavailablePushView: CrmPushView = {
  activate: async () => undefined,
  available: false,
  error: null,
  preferenceEnabled: false,
  refresh: async () => undefined,
  setPreferenceEnabled: async () => undefined,
  status: "unsupported",
};

const CrmPushContext = createContext<CrmPushView>(unavailablePushView);

export function CrmPushProvider({
  api,
  browser = oneSignalBrowser,
  children,
}: {
  api?: CrmPushApi;
  browser?: CrmPushBrowser;
  children: ReactNode;
}) {
  const session = useOptionalAccountSession();
  const activeStore = readSessionActiveStore(session);
  const runtimeApi = useMemo(() => api ?? createRuntimeCrmPushApi(), [api]);
  const hasEntitlement = Boolean(
    activeStore &&
    (!activeStore.entitlements || activeStore.entitlements.includes("crm")),
  );
  const eligible =
    hasEntitlement && hasCrmPermission(session, "crm.conversations.read");
  const value = useCrmPushNotifications({
    api: runtimeApi,
    browser,
    eligible,
    storeKey: activeStore
      ? `${activeStore.tenantId}:${activeStore.storeId}`
      : null,
    userId: session?.user.id ?? null,
  });

  useEffect(() => {
    registerCrmPushLogoutCleanup(async () => {
      await cleanupCrmPushSubscription({
        api: runtimeApi,
        browser,
        keepalive: true,
        subscriptionId: browser.getSnapshot().subscriptionId,
      });
    });
  }, [browser, runtimeApi]);

  return (
    <CrmPushContext.Provider value={value}>{children}</CrmPushContext.Provider>
  );
}

export function useCrmPush() {
  return useContext(CrmPushContext);
}
