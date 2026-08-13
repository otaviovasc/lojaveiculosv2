import { describe, expect, it } from "vitest";
import {
  completeZapiWebhookSetupAttempt,
  createZapiWebhookSetupIntent,
  readZapiWebhookSetupState,
  requiredZapiWebhookTypes,
} from "./zapiWebhookSetupState.js";

describe("Z-API webhook setup evidence", () => {
  it("does not configure from acknowledgements without provider readback", () => {
    const setup = completeZapiWebhookSetupAttempt(
      createZapiWebhookSetupIntent("connection-1"),
      requiredZapiWebhookTypes.map((type) => ({
        error: null,
        ok: true,
        status: 200,
        type,
        url: `https://api.example.com/${type}`,
      })),
    );

    expect(setup.status).not.toBe("configured");
    expect(setup.succeededTypes).toEqual([]);
  });

  it("configures only when every callback has matching provider readback", () => {
    const setup = completeZapiWebhookSetupAttempt(
      createZapiWebhookSetupIntent("connection-1"),
      requiredZapiWebhookTypes.map((type) => ({
        error: null,
        ok: true,
        status: 200,
        type,
        url: `https://api.example.com/${type}`,
        verified: true,
      })),
    );

    expect(setup.status).toBe("configured");
    expect(setup.succeededTypes).toEqual(requiredZapiWebhookTypes);
  });

  it("invalidates legacy version 1 configured evidence", () => {
    const legacy = createZapiWebhookSetupIntent(
      "connection-1",
    ) as unknown as Record<string, unknown>;
    legacy.version = 1;
    legacy.status = "configured";

    expect(readZapiWebhookSetupState({ webhookSetup: legacy })).toMatchObject({
      configuredAt: null,
      lastErrorCode: "verification_required",
      status: "configuring",
      succeededTypes: [],
      version: 2,
    });
  });
});
