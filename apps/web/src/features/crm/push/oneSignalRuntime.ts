import type {
  BrowserPushSnapshot,
  CrmPushBrowser,
  CrmPushBrowserCallbacks,
} from "./types";

const SDK_SCRIPT_URL =
  "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
const SDK_TIMEOUT_MS = 15_000;
const SUBSCRIPTION_TIMEOUT_MS = 10_000;

type OneSignalNotification = {
  additionalData?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

type OneSignalSdk = {
  Notifications: {
    addEventListener: (
      event: "foregroundWillDisplay",
      listener: (event: {
        notification: OneSignalNotification;
        preventDefault: () => void;
      }) => void,
    ) => void;
    requestPermission: () => Promise<void>;
  };
  User: {
    PushSubscription: {
      addEventListener: (event: "change", listener: () => void) => void;
      id: string | null;
      optedIn: boolean;
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
    };
  };
  init: (options: {
    appId: string;
    notifyButton: { enable: false };
    serviceWorkerParam: { scope: string };
    serviceWorkerPath: string;
    welcomeNotification: { disable: true };
  }) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
};

type OneSignalWindow = Window & {
  OneSignalDeferred?: Array<(sdk: OneSignalSdk) => void | Promise<void>>;
};

export function createOneSignalBrowser(
  browserWindow: Window | null = typeof window === "undefined" ? null : window,
): CrmPushBrowser {
  let callbacks: CrmPushBrowserCallbacks | null = null;
  let initializedAppId: string | null = null;
  let initialization: Promise<void> | null = null;
  let initializationAttempt = 0;
  let sdk: OneSignalSdk | null = null;
  let listenersInstalled = false;

  const isSupported = () =>
    Boolean(
      browserWindow &&
      browserWindow.isSecureContext &&
      "Notification" in browserWindow &&
      "PushManager" in browserWindow &&
      "serviceWorker" in browserWindow.navigator,
    );

  const getSnapshot = (): BrowserPushSnapshot => ({
    optedIn: sdk?.User.PushSubscription.optedIn ?? false,
    permission: readPermission(browserWindow),
    subscriptionId: sdk?.User.PushSubscription.id ?? null,
  });

  const installListeners = (oneSignal: OneSignalSdk) => {
    if (listenersInstalled) return;
    listenersInstalled = true;
    oneSignal.User.PushSubscription.addEventListener("change", () => {
      callbacks?.onSubscriptionChange();
    });
    oneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      (event) => {
        const cycleId = readCycleId(event.notification);
        if (callbacks?.shouldSuppressForeground(cycleId)) {
          event.preventDefault();
        }
      },
    );
  };

  const initialize = async (
    appId: string,
    nextCallbacks: CrmPushBrowserCallbacks,
  ) => {
    callbacks = nextCallbacks;
    if (!isSupported()) throw new Error("Push notifications are unsupported.");
    if (initializedAppId && initializedAppId !== appId) {
      throw new Error("OneSignal cannot change apps without reloading.");
    }
    if (initialization) return initialization;
    initializedAppId = appId;
    const attempt = ++initializationAttempt;
    const pendingInitialization = new Promise<void>((resolve, reject) => {
      if (!browserWindow) {
        reject(new Error("Browser window is unavailable."));
        return;
      }
      const deferredWindow = browserWindow as OneSignalWindow;
      let settled = false;
      let deferredCallback:
        ((oneSignal: OneSignalSdk) => Promise<void>) | null = null;
      const removeDeferredCallback = () => {
        if (!deferredCallback) return;
        const callbackIndex =
          deferredWindow.OneSignalDeferred?.indexOf(deferredCallback) ?? -1;
        if (callbackIndex >= 0) {
          deferredWindow.OneSignalDeferred?.splice(callbackIndex, 1);
        }
      };
      const timeout = browserWindow.setTimeout(
        () =>
          rejectInitialization(
            new Error("OneSignal SDK initialization timed out."),
          ),
        SDK_TIMEOUT_MS,
      );
      const rejectInitialization = (error: unknown) => {
        if (settled) return;
        settled = true;
        browserWindow.clearTimeout(timeout);
        removeDeferredCallback();
        reject(error);
      };
      deferredWindow.OneSignalDeferred ??= [];
      deferredCallback = async (oneSignal) => {
        try {
          await oneSignal.init({
            appId,
            notifyButton: { enable: false },
            serviceWorkerParam: { scope: "/" },
            serviceWorkerPath: "/OneSignalSDKWorker.js",
            welcomeNotification: { disable: true },
          });
          if (settled) return;
          sdk = oneSignal;
          installListeners(oneSignal);
          settled = true;
          browserWindow.clearTimeout(timeout);
          resolve();
        } catch (error) {
          rejectInitialization(error);
        }
      };
      deferredWindow.OneSignalDeferred.push(deferredCallback);
      loadSdkScript(browserWindow).catch(rejectInitialization);
    });
    initialization = pendingInitialization.catch((error) => {
      if (initializationAttempt === attempt) {
        initialization = null;
        initializedAppId = null;
        sdk = null;
      }
      throw error;
    });
    return initialization;
  };

  return {
    getSnapshot,
    initialize,
    isSupported,
    login: async (externalId) => {
      if (!sdk) throw new Error("OneSignal SDK is not initialized.");
      await sdk.login(externalId);
    },
    logout: async () => {
      await sdk?.logout();
    },
    optIn: async () => {
      if (!sdk) throw new Error("OneSignal SDK is not initialized.");
      await sdk.User.PushSubscription.optIn();
    },
    optOut: async () => {
      await sdk?.User.PushSubscription.optOut();
    },
    requestPermission: async () => {
      if (!sdk) throw new Error("OneSignal SDK is not initialized.");
      await sdk.Notifications.requestPermission();
    },
    waitForSubscriptionId: async (timeoutMs = SUBSCRIPTION_TIMEOUT_MS) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        const subscriptionId = sdk?.User.PushSubscription.id;
        if (subscriptionId) return subscriptionId;
        await wait(100);
      }
      throw new Error("OneSignal subscription was not created in time.");
    },
  };
}

export const oneSignalBrowser = createOneSignalBrowser();

async function loadSdkScript(browserWindow: Window) {
  const selector = `script[src="${SDK_SCRIPT_URL}"]`;
  if (browserWindow.document.querySelector(selector)) return;
  await new Promise<void>((resolve, reject) => {
    const script = browserWindow.document.createElement("script");
    script.async = true;
    script.src = SDK_SCRIPT_URL;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error("OneSignal SDK failed to load."));
      },
      { once: true },
    );
    browserWindow.document.head.append(script);
  });
}

function readCycleId(notification: OneSignalNotification) {
  const value =
    notification.additionalData?.cycleId ?? notification.data?.cycleId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPermission(browserWindow: Window | null): NotificationPermission {
  if (!browserWindow || !("Notification" in browserWindow)) return "default";
  return (browserWindow as Window & { Notification: typeof Notification })
    .Notification.permission;
}

function wait(durationMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, durationMs));
}
