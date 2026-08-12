import { describe, expect, it, vi } from "vitest";
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
  it("sends text through the provider-locked CRM service", async () => {
    const effect = fixture({
      action: "message.send",
      payload: { text: "Hello" },
    });
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    const sendWhatsappText = vi.fn().mockResolvedValue({
      externalId: "provider-message-1",
      id: "message-1",
    });
    const executor = createExternalBotProviderEffectExecutor({
      db: {} as never,
      logger: createNoopServiceLogger(),
      services: { sendWhatsappText } as never,
    });

    await expect(executor.execute(workerInput())).resolves.toEqual({
      externalEffectId: "provider-message-1",
      kind: "succeeded",
    });
    expect(sendWhatsappText).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: "store-1",
        tenantId: "tenant-1",
      }),
      {
        idempotencyKey: "idem-1",
        senderOrigin: "bot_api",
        senderType: "AI",
        sessionId: "session-1",
        text: "Hello",
      },
    );
    expect(synchronizeExternalBotEffectOutcome).toHaveBeenCalledWith(
      expect.anything(),
      { effect, legacyMessageId: "message-1" },
    );
  });

  it("requests handoff through the attended conversation service", async () => {
    const effect = fixture({
      action: "handoff.request",
      payload: { reason: "Customer asked for a person" },
    });
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    const toggleWhatsappIntervention = vi.fn().mockResolvedValue({});
    const executor = createExternalBotProviderEffectExecutor({
      db: {} as never,
      logger: createNoopServiceLogger(),
      services: { toggleWhatsappIntervention } as never,
    });

    await expect(executor.execute(workerInput())).resolves.toEqual({
      externalEffectId: "effect-1",
      kind: "succeeded",
    });
    expect(toggleWhatsappIntervention).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        enabled: true,
        expectedRevision: 8,
        sessionId: "session-1",
        source: "ai_request",
      }),
    );
  });

  it("fails closed when last-moment authorization is unavailable", async () => {
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(null);
    const executor = createExternalBotProviderEffectExecutor({
      db: {} as never,
      logger: createNoopServiceLogger(),
      services: {} as never,
    });
    await expect(executor.execute(workerInput())).resolves.toEqual({
      code: "authorization_revoked",
      kind: "failed",
      retryable: false,
    });
  });

  it("keeps provider success indeterminate when canonical synchronization needs reconciliation", async () => {
    const effect = fixture({
      action: "message.send",
      payload: { text: "Hello" },
    });
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    vi.mocked(synchronizeExternalBotEffectOutcome).mockRejectedValue(
      new ExternalBotCanonicalSyncIndeterminateError(),
    );
    const executor = createExternalBotProviderEffectExecutor({
      db: {} as never,
      logger: createNoopServiceLogger(),
      services: {
        sendWhatsappText: vi.fn().mockResolvedValue({
          externalId: "provider-message-1",
          id: "message-1",
        }),
      } as never,
    });

    await expect(executor.execute(workerInput())).resolves.toEqual({
      code: "delivery_indeterminate",
      kind: "indeterminate",
    });
  });

  it("does not retry a deterministic provider rejection", async () => {
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(
      fixture({ action: "message.send", payload: { text: "Hello" } }),
    );
    const executor = createExternalBotProviderEffectExecutor({
      db: {} as never,
      logger: createNoopServiceLogger(),
      services: {
        sendWhatsappText: vi.fn().mockRejectedValue(
          Object.assign(new Error("rejected"), {
            code: "provider_rejected",
            status: 502,
          }),
        ),
      } as never,
    });

    await expect(executor.execute(workerInput())).resolves.toEqual({
      code: "provider_rejected",
      kind: "failed",
      retryable: false,
    });
  });
});

function fixture(
  command: AuthorizedExternalBotEffect["command"],
): AuthorizedExternalBotEffect {
  return {
    canonicalCycleId: "cycle-1",
    command,
    effectId: "effect-1",
    expectedRevision: 4,
    idempotencyKey: "idem-1",
    integrationId: "integration-1",
    legacySessionId: "session-1",
    legacySessionRevision: 8,
    modelVersion: "model-1",
    provider: "zapi",
    providerConnectionId: "connection-1",
    storeId: "store-1",
    tenantId: "tenant-1",
    threadId: "thread-1",
  };
}

function workerInput() {
  return {
    effectId: "effect-1",
    effectType: "message.send",
    idempotencyKey: "idem-1",
    provider: "zapi",
    providerConnectionId: "connection-1",
  };
}
