import { describe, expect, it } from "vitest";
import {
  CrmPushConfigurationError,
  readCrmPushPublicConfig,
  readCrmPushRuntimeConfig,
} from "./crmPushRuntimeConfig.js";

describe("CRM push runtime config", () => {
  it("defaults delivery off and does not expose an app id", () => {
    expect(readCrmPushRuntimeConfig({})).toMatchObject({
      apiKey: null,
      appId: null,
      batchSize: 25,
      cleanupBatchSize: 100,
      deliveryMode: "off",
      maxAttempts: 8,
      requestTimeoutMs: 10_000,
      terminalRetentionDays: 30,
    });
  });

  it("requires both server-owned credentials for live delivery", () => {
    expect(() =>
      readCrmPushRuntimeConfig({ CRM_PUSH_DELIVERY_MODE: "live" }),
    ).toThrow(CrmPushConfigurationError);
  });

  it("returns only public data from the public config reader", () => {
    expect(
      readCrmPushPublicConfig({
        CRM_PUSH_DELIVERY_MODE: "live",
        ONESIGNAL_API_KEY: "secret",
        ONESIGNAL_APP_ID: "app-id",
      }),
    ).toEqual({ appId: "app-id", deliveryMode: "live" });
  });

  it("exposes only the browser app id in shadow mode", () => {
    expect(
      readCrmPushRuntimeConfig({
        CRM_PUSH_DELIVERY_MODE: "shadow",
        ONESIGNAL_API_KEY: "secret",
        ONESIGNAL_APP_ID: "app-id",
      }),
    ).toMatchObject({ apiKey: null, appId: "app-id", deliveryMode: "shadow" });
  });

  it("rejects a lease that can expire during a provider request", () => {
    expect(() =>
      readCrmPushRuntimeConfig({
        CRM_PUSH_LEASE_DURATION_MS: "24000",
        CRM_PUSH_REQUEST_TIMEOUT_MS: "10000",
      }),
    ).toThrow(
      "CRM_PUSH_LEASE_DURATION_MS must be at least 15000ms longer than CRM_PUSH_REQUEST_TIMEOUT_MS.",
    );
  });
});
