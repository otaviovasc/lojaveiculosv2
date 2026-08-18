import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNoopServiceLogger } from "../../../shared/serviceContext.js";
import type { AuthorizedExternalBotEffect } from "../../db/crm/drizzleExternalBotEffectRuntime.js";
import { createExternalBotProviderEffectExecutor } from "./externalBotProviderEffectExecutor.js";

vi.mock("../../db/crm/drizzleExternalBotEffectRuntime.js", () => ({
  ExternalBotCanonicalSyncIndeterminateError: class extends Error {
    readonly code = "canonical_sync_indeterminate";
  },
  loadAuthorizedExternalBotEffect: vi.fn(),
  synchronizeExternalBotEffectOutcome: vi.fn(),
}));

import {
  ExternalBotCanonicalSyncIndeterminateError,
  loadAuthorizedExternalBotEffect,
  synchronizeExternalBotEffectOutcome,
} from "../../db/crm/drizzleExternalBotEffectRuntime.js";

describe("external bot provider effect executor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(synchronizeExternalBotEffectOutcome).mockResolvedValue(undefined);
  });

  it("sends through the provider-bound canonical connection and synchronizes evidence", async () => {
    const effect = fixture({
      action: "message.send",
      payload: { text: "Hello" },
    });
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    const sendText = vi.fn().mockResolvedValue(providerResult);
    const executor = createExecutor(sendText);

    await expect(executor.execute(workerInput())).resolves.toEqual({
      externalEffectId: "provider-message-1",
      kind: "succeeded",
    });
    expect(sendText).toHaveBeenCalledWith(effect.connection, {
      phone: "5511999999999",
      text: "Hello",
    });
    expect(synchronizeExternalBotEffectOutcome).toHaveBeenCalledWith(
      expect.anything(),
      {
        effect,
        providerOperation: {
          id: "provider-message-1",
          occurredAt: providerResult.providerTimestamp,
        },
      },
    );
  });

  it("reuses canonical provider evidence on idempotent replay", async () => {
    const effect = {
      ...fixture({ action: "message.send", payload: { text: "Hello" } }),
      providerOperation: {
        id: "provider-message-existing",
        occurredAt: new Date("2026-08-18T11:00:00.000Z"),
      },
    };
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    const sendText = vi.fn();

    await expect(
      createExecutor(sendText).execute(workerInput()),
    ).resolves.toEqual({
      externalEffectId: "provider-message-existing",
      kind: "succeeded",
    });
    expect(sendText).not.toHaveBeenCalled();
    expect(synchronizeExternalBotEffectOutcome).toHaveBeenCalledWith(
      expect.anything(),
      { effect, providerOperation: effect.providerOperation },
    );
  });

  it("requests handoff only through canonical synchronization", async () => {
    const effect = fixture({
      action: "handoff.request",
      payload: { reason: "Customer asked for a person" },
    });
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    const sendText = vi.fn();

    await expect(
      createExecutor(sendText).execute(workerInput()),
    ).resolves.toEqual({
      externalEffectId: "effect-1",
      kind: "succeeded",
    });
    expect(sendText).not.toHaveBeenCalled();
    expect(synchronizeExternalBotEffectOutcome).toHaveBeenCalledWith(
      expect.anything(),
      { effect },
    );
  });

  it("fails closed when last-moment canonical authorization is unavailable", async () => {
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(null);

    await expect(
      createExecutor(vi.fn()).execute(workerInput()),
    ).resolves.toEqual({
      code: "authorization_revoked",
      kind: "failed",
      retryable: false,
    });
  });

  it("keeps provider success indeterminate when canonical synchronization needs reconciliation", async () => {
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(
      fixture({ action: "message.send", payload: { text: "Hello" } }),
    );
    vi.mocked(synchronizeExternalBotEffectOutcome).mockRejectedValue(
      new ExternalBotCanonicalSyncIndeterminateError(),
    );

    await expect(
      createExecutor(vi.fn().mockResolvedValue(providerResult)).execute(
        workerInput(),
      ),
    ).resolves.toEqual({
      code: "delivery_indeterminate",
      kind: "indeterminate",
    });
  });

  it("does not retry a deterministic provider rejection", async () => {
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(
      fixture({ action: "message.send", payload: { text: "Hello" } }),
    );
    const sendText = vi.fn().mockRejectedValue(
      Object.assign(new Error("rejected"), {
        code: "provider_rejected",
        status: 502,
      }),
    );

    await expect(
      createExecutor(sendText).execute(workerInput()),
    ).resolves.toEqual({
      code: "provider_rejected",
      kind: "failed",
      retryable: false,
    });
  });
});

function createExecutor(sendText: ReturnType<typeof vi.fn>) {
  return createExternalBotProviderEffectExecutor({
    db: {} as never,
    gateway: { sendText } as never,
    logger: createNoopServiceLogger(),
  });
}

function fixture(
  command: AuthorizedExternalBotEffect["command"],
): AuthorizedExternalBotEffect {
  return {
    canonicalCycleId: "cycle-1",
    command,
    connection: {
      canonical: {
        broker: "direct",
        capabilities: ["inbound", "outbound"],
        channel: "whatsapp",
        connected: true,
        degraded: false,
        errorCode: null,
        provider: "zapi",
        readiness: { ready: true, reason: null, reasonCode: "ready" },
        state: "active",
      },
      credentialsRef: {},
      displayName: "Canonical Z-API",
      externalConnectionId: null,
      externalInstanceId: null,
      id: "connection-1",
      metadata: {},
      phone: null,
      provider: "zapi",
      status: "active",
      storeId: "store-1" as never,
      tenantId: "tenant-1" as never,
      webhookUrl: null,
    },
    effectId: "effect-1",
    expectedRevision: 4,
    idempotencyKey: "idem-1",
    integrationId: "integration-1",
    modelVersion: "model-1",
    provider: "zapi",
    providerAddress: "5511999999999",
    providerConnectionId: "connection-1",
    requestDigest: "request-digest-1",
    storeId: "store-1",
    tenantId: "tenant-1",
    threadId: "thread-1",
  };
}

const providerResult = {
  externalId: "provider-message-1",
  providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
};

function workerInput() {
  return {
    effectId: "effect-1",
    effectType: "message.send",
    idempotencyKey: "idem-1",
    provider: "zapi",
    providerConnectionId: "connection-1",
  };
}
