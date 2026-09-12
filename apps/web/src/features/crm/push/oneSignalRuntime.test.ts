// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOneSignalBrowser } from "./oneSignalRuntime";

afterEach(() => {
  document
    .querySelectorAll("script[src*='OneSignalSDK']")
    .forEach((node) => node.remove());
  delete (window as Window & { OneSignalDeferred?: unknown }).OneSignalDeferred;
});

describe("OneSignal browser runtime", () => {
  it("uses the root worker and installs SDK listeners only once", async () => {
    installPushBrowserSupport();
    const subscriptionListener = vi.fn();
    const foregroundListener =
      vi.fn<
        (event: {
          notification: { additionalData?: Record<string, unknown> };
          preventDefault: () => void;
        }) => void
      >();
    const sdk = {
      Notifications: {
        addEventListener: vi.fn(
          (event: string, listener: typeof foregroundListener) => {
            if (event === "foregroundWillDisplay") {
              foregroundListener.mockImplementation((input) => listener(input));
            }
          },
        ),
        requestPermission: vi.fn(async () => undefined),
      },
      User: {
        PushSubscription: {
          addEventListener: vi.fn((_event: string, listener: () => void) =>
            subscriptionListener.mockImplementation(listener),
          ),
          id: "subscription-1",
          optedIn: true,
          optIn: vi.fn(async () => undefined),
          optOut: vi.fn(async () => undefined),
        },
      },
      init: vi.fn(async () => undefined),
      login: vi.fn(async () => undefined),
      logout: vi.fn(async () => undefined),
    };
    const shouldSuppressForeground = vi.fn(() => true);
    const runtime = createOneSignalBrowser(window);
    const callbacks = {
      onSubscriptionChange: vi.fn(),
      shouldSuppressForeground,
    };

    const firstInitialization = runtime.initialize("app-id", callbacks);
    const deferred = (
      window as unknown as Window & {
        OneSignalDeferred: Array<(sdk: unknown) => void | Promise<void>>;
      }
    ).OneSignalDeferred;
    await deferred[0]?.(sdk);
    await firstInitialization;
    await runtime.initialize("app-id", callbacks);

    expect(sdk.init).toHaveBeenCalledOnce();
    expect(sdk.init).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceWorkerParam: { scope: "/" },
        serviceWorkerPath: "/OneSignalSDKWorker.js",
      }),
    );
    expect(sdk.User.PushSubscription.addEventListener).toHaveBeenCalledOnce();
    expect(sdk.Notifications.addEventListener).toHaveBeenCalledOnce();

    const preventDefault = vi.fn();
    foregroundListener({
      notification: { additionalData: { cycleId: "cycle-1" } },
      preventDefault,
    });
    expect(shouldSuppressForeground).toHaveBeenCalledWith("cycle-1");
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it("retries initialization after the SDK script fails to load", async () => {
    installPushBrowserSupport();
    const runtime = createOneSignalBrowser(window);
    const callbacks = {
      onSubscriptionChange: vi.fn(),
      shouldSuppressForeground: vi.fn(() => false),
    };

    const failedInitialization = runtime.initialize("failed-app", callbacks);
    const failedScript = document.querySelector<HTMLScriptElement>(
      "script[src*='OneSignalSDK']",
    );
    failedScript?.dispatchEvent(new Event("error"));

    await expect(failedInitialization).rejects.toThrow(
      "OneSignal SDK failed to load.",
    );

    const successfulInitialization = runtime.initialize(
      "successful-app",
      callbacks,
    );
    const retryScript = document.querySelector<HTMLScriptElement>(
      "script[src*='OneSignalSDK']",
    );
    const sdk = createSdk();
    const deferred = (
      window as unknown as Window & {
        OneSignalDeferred: Array<(sdk: unknown) => void | Promise<void>>;
      }
    ).OneSignalDeferred;
    await deferred.at(-1)?.(sdk);
    await successfulInitialization;

    expect(retryScript).not.toBe(failedScript);
    expect(sdk.init).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: "successful-app",
        serviceWorkerParam: { scope: "/" },
        serviceWorkerPath: "/OneSignalSDKWorker.js",
      }),
    );
    expect(sdk.User.PushSubscription.addEventListener).toHaveBeenCalledOnce();
    expect(sdk.Notifications.addEventListener).toHaveBeenCalledOnce();
  });

  it("retries initialization after the SDK rejects initialization", async () => {
    installPushBrowserSupport();
    const runtime = createOneSignalBrowser(window);
    const callbacks = {
      onSubscriptionChange: vi.fn(),
      shouldSuppressForeground: vi.fn(() => false),
    };
    const failedSdk = createSdk();
    failedSdk.init.mockRejectedValueOnce(new Error("SDK init failed."));

    const failedInitialization = runtime.initialize("failed-app", callbacks);
    const firstDeferred = (
      window as unknown as Window & {
        OneSignalDeferred: Array<(sdk: unknown) => void | Promise<void>>;
      }
    ).OneSignalDeferred;
    await firstDeferred.at(-1)?.(failedSdk);

    await expect(failedInitialization).rejects.toThrow("SDK init failed.");

    const successfulSdk = createSdk();
    const successfulInitialization = runtime.initialize(
      "successful-app",
      callbacks,
    );
    const retryDeferred = (
      window as unknown as Window & {
        OneSignalDeferred: Array<(sdk: unknown) => void | Promise<void>>;
      }
    ).OneSignalDeferred;
    await retryDeferred.at(-1)?.(successfulSdk);
    await successfulInitialization;

    expect(successfulSdk.init).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: "successful-app",
        serviceWorkerParam: { scope: "/" },
        serviceWorkerPath: "/OneSignalSDKWorker.js",
      }),
    );
    expect(
      successfulSdk.User.PushSubscription.addEventListener,
    ).toHaveBeenCalledOnce();
    expect(successfulSdk.Notifications.addEventListener).toHaveBeenCalledOnce();
  });
});

function createSdk() {
  return {
    Notifications: {
      addEventListener: vi.fn(),
      requestPermission: vi.fn(async () => undefined),
    },
    User: {
      PushSubscription: {
        addEventListener: vi.fn(),
        id: "subscription-1",
        optedIn: true,
        optIn: vi.fn(async () => undefined),
        optOut: vi.fn(async () => undefined),
      },
    },
    init: vi.fn(async () => undefined),
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
  };
}

function installPushBrowserSupport() {
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { permission: "granted" },
  });
  Object.defineProperty(window, "PushManager", {
    configurable: true,
    value: class PushManager {},
  });
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: {},
  });
}
