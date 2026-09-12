import { useCallback, useEffect, useRef, useState } from "react";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import { readCrmConversationCycleIdFromHash } from "../crmRouteState";
import type { CrmPushApi } from "./apiClient";
import {
  cleanupCrmPushSubscription,
  hasPendingCrmPushCleanup,
  rememberCrmPushSubscriptionId,
  retryPendingCrmPushCleanup,
} from "./logoutCleanup";
import type {
  BrowserPushSnapshot,
  CrmPushBrowser,
  CrmPushSettings,
  CrmPushStatus,
  CrmPushView,
} from "./types";

export function useCrmPushNotifications(input: {
  api: CrmPushApi;
  browser: CrmPushBrowser;
  eligible: boolean;
  storeKey: string | null;
  userId: string | null;
}): CrmPushView {
  const { api, browser, eligible, storeKey, userId } = input;
  const [settings, setSettings] = useState<CrmPushSettings | null>(null);
  const [status, setStatus] = useState<CrmPushStatus>("default");
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const previousUserIdRef = useRef<string | null>(null);
  const registrationAllowedRef = useRef(false);
  const identityTransitionRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applySnapshot = useCallback(
    (nextSettings: CrmPushSettings, snapshot: BrowserPushSnapshot) => {
      if (!mountedRef.current) return;
      setSettings(nextSettings);
      setStatus(statusFor(nextSettings, snapshot));
      setError(
        nextSettings.deliveryMode === "shadow"
          ? "As notificações estão em validação e ainda não serão entregues."
          : null,
      );
    },
    [],
  );

  const initializeBrowser = useCallback(
    async (nextSettings: CrmPushSettings) => {
      if (!nextSettings.appId) {
        throw new Error("O OneSignal não está configurado para este ambiente.");
      }
      registrationAllowedRef.current = false;
      await browser.initialize(nextSettings.appId, {
        onSubscriptionChange: () => {
          if (!registrationAllowedRef.current || hasPendingCrmPushCleanup()) {
            return;
          }
          const snapshot = browser.getSnapshot();
          const subscriptionId = snapshot.subscriptionId;
          if (subscriptionId && snapshot.optedIn) {
            void api
              .registerSubscription(subscriptionId)
              .then(() => {
                rememberCrmPushSubscriptionId(subscriptionId);
                applySnapshot(nextSettings, snapshot);
              })
              .catch((subscriptionError) => {
                if (!mountedRef.current) return;
                setStatus("degraded");
                setError(pushError(subscriptionError));
              });
            return;
          }
          applySnapshot(nextSettings, snapshot);
        },
        shouldSuppressForeground: (cycleId) =>
          shouldSuppressForegroundNotification(cycleId),
      });
      const cleanupComplete = await retryPendingCrmPushCleanup({
        api,
        browser,
      });
      if (!cleanupComplete) {
        throw new Error(
          "Não foi possível concluir a limpeza das notificações da sessão anterior.",
        );
      }
      if (!userId) throw new Error("A sessão do usuário não está disponível.");
      await browser.login(userId);
      registrationAllowedRef.current = true;
      const snapshot = browser.getSnapshot();
      if (snapshot.subscriptionId && snapshot.optedIn) {
        await api.registerSubscription(snapshot.subscriptionId);
        rememberCrmPushSubscriptionId(snapshot.subscriptionId);
      }
      applySnapshot(nextSettings, snapshot);
    },
    [api, applySnapshot, browser, userId],
  );

  const refresh = useCallback(async () => {
    if (!eligible || !userId || !storeKey) return;
    await identityTransitionRef.current;
    if (!browser.isSupported()) {
      setStatus("unsupported");
      setError(null);
      return;
    }
    try {
      const nextSettings = await api.getSettings();
      setSettings(nextSettings);
      if (!nextSettings.appId || nextSettings.deliveryMode === "off") {
        registrationAllowedRef.current = false;
        setStatus("degraded");
        setError("As notificações do CRM não estão ativas neste ambiente.");
        return;
      }
      await initializeBrowser(nextSettings);
    } catch (refreshError) {
      if (!mountedRef.current) return;
      setStatus("degraded");
      setError(pushError(refreshError));
    }
  }, [api, browser, eligible, initializeBrowser, storeKey, userId]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = userId;
    if (previousUserId && previousUserId !== userId) {
      registrationAllowedRef.current = false;
      const subscriptionId = browser.getSnapshot().subscriptionId;
      identityTransitionRef.current = cleanupCrmPushSubscription({
        api,
        browser,
        subscriptionId,
      }).then(() => undefined);
    }
  }, [api, browser, userId]);

  useEffect(() => {
    if (!eligible || !userId) registrationAllowedRef.current = false;
  }, [eligible, userId]);

  useEffect(() => {
    if (!eligible) return;
    void refresh();
  }, [eligible, refresh, storeKey]);

  const activate = useCallback(async () => {
    if (!settings?.appId || !userId) {
      setStatus("degraded");
      setError("As notificações do CRM não estão configuradas.");
      return;
    }
    setStatus(
      browser.getSnapshot().permission === "default" ? "requesting" : "saving",
    );
    setError(null);
    try {
      registrationAllowedRef.current = false;
      await browser.initialize(settings.appId, {
        onSubscriptionChange: () => {
          if (registrationAllowedRef.current && !hasPendingCrmPushCleanup()) {
            void refresh();
          }
        },
        shouldSuppressForeground: (cycleId) =>
          shouldSuppressForegroundNotification(cycleId),
      });
      const cleanupComplete = await retryPendingCrmPushCleanup({
        api,
        browser,
      });
      if (!cleanupComplete) {
        throw new Error(
          "Não foi possível concluir a limpeza das notificações da sessão anterior.",
        );
      }
      await browser.login(userId);
      registrationAllowedRef.current = true;
      if (browser.getSnapshot().permission === "default") {
        await browser.requestPermission();
      }
      if (browser.getSnapshot().permission === "denied") {
        applySnapshot(settings, browser.getSnapshot());
        return;
      }
      await browser.optIn();
      const subscriptionId = await browser.waitForSubscriptionId();
      await api.registerSubscription(subscriptionId);
      rememberCrmPushSubscriptionId(subscriptionId);
      await api.updatePreference(true);
      applySnapshot(
        {
          ...settings,
          preference: { enabled: true },
          subscription: { enabled: true, id: subscriptionId },
        },
        browser.getSnapshot(),
      );
    } catch (activationError) {
      if (!mountedRef.current) return;
      setStatus("degraded");
      setError(pushError(activationError));
    }
  }, [api, applySnapshot, browser, refresh, settings, userId]);

  const setPreferenceEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        await activate();
        return;
      }
      if (!settings) return;
      setStatus("saving");
      setError(null);
      try {
        await api.updatePreference(false);
        applySnapshot(
          { ...settings, preference: { enabled: false } },
          browser.getSnapshot(),
        );
      } catch (preferenceError) {
        if (!mountedRef.current) return;
        setStatus("degraded");
        setError(pushError(preferenceError));
      }
    },
    [activate, api, applySnapshot, browser, settings],
  );

  return {
    activate,
    available: eligible,
    error,
    preferenceEnabled: settings?.preference.enabled ?? false,
    refresh,
    setPreferenceEnabled,
    status: eligible ? status : "unsupported",
  };
}

export function shouldSuppressForegroundNotification(cycleId: string | null) {
  return Boolean(
    cycleId &&
    typeof document !== "undefined" &&
    document.visibilityState === "visible" &&
    typeof window !== "undefined" &&
    readCrmConversationCycleIdFromHash(window.location.hash) === cycleId,
  );
}

function statusFor(
  settings: CrmPushSettings,
  snapshot: BrowserPushSnapshot,
): CrmPushStatus {
  if (snapshot.permission === "denied") return "blocked";
  if (snapshot.permission === "default") return "default";
  if (settings.deliveryMode === "shadow") return "degraded";
  if (!snapshot.optedIn || !snapshot.subscriptionId) return "disabled";
  if (!settings.preference.enabled) return "disabled";
  return "enabled";
}

function pushError(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Não foi possível atualizar as notificações do CRM.",
  );
}
