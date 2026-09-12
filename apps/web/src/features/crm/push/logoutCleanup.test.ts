// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  disableSubscription: vi.fn(async () => undefined),
  logout: vi.fn(async () => undefined),
  optOut: vi.fn(async () => undefined),
}));

vi.mock("./runtimeApi", () => ({
  createRuntimeCrmPushApi: () => ({
    disableSubscription: mocks.disableSubscription,
  }),
}));

vi.mock("./oneSignalRuntime", () => ({
  oneSignalBrowser: {
    logout: mocks.logout,
    optOut: mocks.optOut,
  },
}));

import {
  cleanupCrmPushBeforeLogout,
  rememberCrmPushSubscriptionId,
  retryPendingCrmPushCleanup,
} from "./logoutCleanup";

describe("CRM push logout cleanup", () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("disables a remembered subscription even after the admin shell unmounts", async () => {
    rememberCrmPushSubscriptionId("subscription-1");

    await cleanupCrmPushBeforeLogout();

    expect(mocks.disableSubscription).toHaveBeenCalledWith("subscription-1", {
      keepalive: true,
    });
    expect(mocks.optOut).toHaveBeenCalledOnce();
    expect(mocks.logout).toHaveBeenCalledOnce();
  });

  it("keeps failed cleanup durable and retries it before reuse", async () => {
    rememberCrmPushSubscriptionId("subscription-pending");
    mocks.disableSubscription.mockRejectedValueOnce(new Error("offline"));
    mocks.optOut.mockRejectedValueOnce(new Error("sdk unavailable"));

    await expect(cleanupCrmPushBeforeLogout()).resolves.toBeUndefined();

    expect(mocks.disableSubscription).toHaveBeenCalledOnce();
    expect(mocks.optOut).toHaveBeenCalledOnce();
    expect(mocks.logout).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    await expect(retryPendingCrmPushCleanup()).resolves.toBe(true);

    expect(mocks.disableSubscription).toHaveBeenCalledWith(
      "subscription-pending",
      { keepalive: false },
    );
    expect(mocks.optOut).toHaveBeenCalledOnce();
    expect(mocks.logout).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    await expect(retryPendingCrmPushCleanup()).resolves.toBe(true);
    expect(mocks.disableSubscription).not.toHaveBeenCalled();
    expect(mocks.optOut).not.toHaveBeenCalled();
    expect(mocks.logout).not.toHaveBeenCalled();
  });
});
