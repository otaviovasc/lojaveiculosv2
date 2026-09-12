// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmPushApi } from "./apiClient";
import type { CrmPushBrowser, CrmPushSettings } from "./types";
import {
  shouldSuppressForegroundNotification,
  useCrmPushNotifications,
} from "./useCrmPushNotifications";

describe("useCrmPushNotifications", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("keeps the subscription enabled on normal page close", async () => {
    const api = createApi();
    const browser = createBrowser();
    const { unmount } = renderHook(() =>
      useCrmPushNotifications({
        api,
        browser,
        eligible: true,
        storeKey: "tenant:store",
        userId: "user-a",
      }),
    );

    await waitFor(() => expect(browser.login).toHaveBeenCalledWith("user-a"));
    await act(async () => {
      window.dispatchEvent(new Event("pagehide"));
    });
    unmount();

    expect(api.disableSubscription).not.toHaveBeenCalled();
    expect(browser.optOut).not.toHaveBeenCalled();
    expect(browser.logout).not.toHaveBeenCalled();
  });

  it("retries failed old-browser cleanup before switching accounts", async () => {
    const api = createApi();
    const browser = createBrowser();
    const { rerender } = renderHook(
      ({ userId }) =>
        useCrmPushNotifications({
          api,
          browser,
          eligible: true,
          storeKey: "tenant:store",
          userId,
        }),
      { initialProps: { userId: "user-a" as string | null } },
    );

    await waitFor(() => expect(browser.login).toHaveBeenCalledWith("user-a"));
    vi.mocked(api.disableSubscription).mockRejectedValueOnce(
      new Error("offline"),
    );
    rerender({ userId: "user-b" });

    await waitFor(() =>
      expect(api.disableSubscription).toHaveBeenCalledWith("subscription-1", {
        keepalive: false,
      }),
    );
    await waitFor(() =>
      expect(api.disableSubscription).toHaveBeenCalledTimes(2),
    );
    await waitFor(() => expect(browser.logout).toHaveBeenCalledTimes(2));
    expect(browser.optOut).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(browser.login).toHaveBeenCalledWith("user-b"));
    expect(
      vi.mocked(api.disableSubscription).mock.invocationCallOrder[1],
    ).toBeLessThan(vi.mocked(browser.login).mock.invocationCallOrder[1]!);
  });

  it("initializes and registers subscriptions in shadow mode", async () => {
    const api = createApi({ deliveryMode: "shadow" });
    const browser = createBrowser();

    const { result } = renderHook(() =>
      useCrmPushNotifications({
        api,
        browser,
        eligible: true,
        storeKey: "tenant:store",
        userId: "user-a",
      }),
    );

    await waitFor(() => expect(browser.login).toHaveBeenCalledWith("user-a"));
    expect(api.registerSubscription).toHaveBeenCalledWith("subscription-1");
    expect(result.current.status).toBe("degraded");
    expect(result.current.error).toMatch(/valida[cç][aã]o/i);
  });

  it("suppresses only the visible CRM cycle", () => {
    window.location.hash = "/crm?surface=conversations&cycleId=cycle-1";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    expect(shouldSuppressForegroundNotification("cycle-1")).toBe(true);
    expect(shouldSuppressForegroundNotification("cycle-2")).toBe(false);
    expect(shouldSuppressForegroundNotification(null)).toBe(false);
  });
});

function createApi(overrides: Partial<CrmPushSettings> = {}): CrmPushApi {
  return {
    disableSubscription: vi.fn(async () => undefined),
    getSettings: vi.fn(
      async () =>
        ({
          appId: "app-id",
          deliveryMode: "live",
          preference: { enabled: true },
          subscription: { enabled: true, id: "subscription-1" },
          ...overrides,
        }) satisfies CrmPushSettings,
    ),
    registerSubscription: vi.fn(async () => undefined),
    updatePreference: vi.fn(async () => undefined),
  };
}

function createBrowser(): CrmPushBrowser {
  return {
    getSnapshot: () => ({
      optedIn: true,
      permission: "granted",
      subscriptionId: "subscription-1",
    }),
    initialize: vi.fn(async () => undefined),
    isSupported: () => true,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    optIn: vi.fn(async () => undefined),
    optOut: vi.fn(async () => undefined),
    requestPermission: vi.fn(async () => undefined),
    waitForSubscriptionId: vi.fn(async () => "subscription-1"),
  };
}
