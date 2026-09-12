import { describe, expect, it } from "vitest";
import {
  completeUazapiWebhookSetupAttempt,
  createUazapiWebhookSetupIntent,
  failUazapiWebhookSetupAttempt,
  markUazapiWebhookSetupAttempt,
  readUazapiWebhookSetupState,
  withUazapiWebhookSetupState,
} from "./uazapiWebhookSetupState.js";

describe("uazapi webhook setup evidence", () => {
  it("reads the pending intent written at connection creation", () => {
    expect(
      readUazapiWebhookSetupState({ uazapiWebhookSetup: { state: "pending" } }),
    ).toMatchObject({ attemptCount: 0, state: "pending" });
  });

  it("configures only when the single registration has provider readback", () => {
    const configuring = markUazapiWebhookSetupAttempt(
      createUazapiWebhookSetupIntent("connection-1"),
    );

    const unverified = completeUazapiWebhookSetupAttempt(configuring, [
      {
        error: null,
        ok: true,
        status: 200,
        type: "uazapi",
        url: "https://api.example.com/whatsapp/webhooks/uazapi/connection-1",
      },
    ]);
    expect(unverified.state).toBe("failed");

    const verified = completeUazapiWebhookSetupAttempt(configuring, [
      {
        error: null,
        ok: true,
        status: 200,
        type: "uazapi",
        url: "https://api.example.com/whatsapp/webhooks/uazapi/connection-1",
        verified: true,
      },
    ]);
    expect(verified).toMatchObject({
      state: "configured",
      succeededTypes: ["uazapi"],
    });
  });

  it("persists failed attempts with attempt counts", () => {
    const configuring = markUazapiWebhookSetupAttempt(
      createUazapiWebhookSetupIntent("connection-1"),
    );
    const failed = failUazapiWebhookSetupAttempt(
      configuring,
      new Error("boom"),
    );
    expect(failed).toMatchObject({
      attemptCount: 1,
      lastErrorCode: "request_failed",
      state: "failed",
    });

    const metadata = withUazapiWebhookSetupState({}, failed);
    expect(readUazapiWebhookSetupState(metadata)).toMatchObject({
      attemptCount: 1,
      state: "failed",
    });
  });
});
