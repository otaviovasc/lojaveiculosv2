import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createExternalBotEffectExecutor as createExecutor,
  externalBotConnectionFixture as fixtureConnection,
  externalBotEffectFixture as fixture,
  externalBotProviderResult as providerResult,
  externalBotWorkerInput as workerInput,
} from "./externalBotProviderEffectExecutor.testSupport.js";

vi.mock("../../db/crm/drizzleExternalBotEffectRuntime.js", () => ({
  ExternalBotCanonicalSyncIndeterminateError: class extends Error {
    readonly code = "canonical_sync_indeterminate";
  },
  loadAuthorizedExternalBotEffect: vi.fn(),
  synchronizeExternalBotEffectOutcome: vi.fn(),
  wasExternalBotProviderAttempted: vi.fn(),
}));

vi.mock(
  "../../../domains/crm/services/CrmRoutingService/resolveCrmProviderOperation.js",
  () => ({ resolveCrmProviderOperation: vi.fn() }),
);

import {
  loadAuthorizedExternalBotEffect,
  synchronizeExternalBotEffectOutcome,
  wasExternalBotProviderAttempted,
} from "../../db/crm/drizzleExternalBotEffectRuntime.js";
import { resolveCrmProviderOperation } from "../../../domains/crm/services/CrmRoutingService/resolveCrmProviderOperation.js";

describe("external bot provider effect executor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(synchronizeExternalBotEffectOutcome).mockResolvedValue(undefined);
    vi.mocked(wasExternalBotProviderAttempted).mockResolvedValue(false);
    vi.mocked(resolveCrmProviderOperation).mockImplementation(async (input) =>
      fixtureConnection({
        id: input.connectionId ?? "connection-default",
        storeId: input.scope.storeId as never,
        tenantId: input.scope.tenantId as never,
      }),
    );
  });

  it("sends through the provider-bound canonical connection and synchronizes evidence", async () => {
    const effect = fixture({
      action: "message.send_text",
      payload: { text: "Hello" },
    });
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    const sendText = vi.fn().mockResolvedValue(providerResult);
    const executor = createExecutor(sendText);

    await expect(executor.execute(workerInput())).resolves.toEqual({
      externalEffectId: "provider-message-1",
      kind: "succeeded",
    });
    expect(
      vi.mocked(resolveCrmProviderOperation).mock.calls[0]?.[0],
    ).toMatchObject({
      channel: "whatsapp",
      connectionId: "connection-1",
      requiredCapabilities: ["outbound", "text"],
      scope: { storeId: "store-1", tenantId: "tenant-1" },
    });
    expect(sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "Execution-time connection",
        id: "connection-1",
      }),
      {
        phone: "5511999999999",
        text: "Hello",
      },
    );
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
      ...fixture({ action: "message.send_text", payload: { text: "Hello" } }),
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
    expect(resolveCrmProviderOperation).not.toHaveBeenCalled();
    expect(synchronizeExternalBotEffectOutcome).toHaveBeenCalledWith(
      expect.anything(),
      { effect, providerOperation: effect.providerOperation },
    );
  });

  it("sends media with outbound and media capabilities", async () => {
    const effect = fixture({
      action: "message.send_media",
      payload: {
        caption: "Vehicle photo",
        mediaType: "image",
        mediaUrl: "https://cdn.example.com/vehicle.jpg",
      },
    });
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    const sendMedia = vi.fn().mockResolvedValue(providerResult);
    const executor = createExecutor(vi.fn(), { sendMedia });

    await expect(executor.execute(workerInput())).resolves.toMatchObject({
      kind: "succeeded",
    });
    expect(resolveCrmProviderOperation).toHaveBeenCalledWith(
      expect.objectContaining({ requiredCapabilities: ["outbound", "media"] }),
    );
    expect(sendMedia).toHaveBeenCalledWith(expect.anything(), {
      caption: "Vehicle photo",
      mediaType: "image",
      mediaUrl: "https://cdn.example.com/vehicle.jpg",
      phone: "5511999999999",
    });
    expect(
      vi.mocked(synchronizeExternalBotEffectOutcome).mock.calls[0]?.[1],
    ).toMatchObject({
      effect,
      providerOperation: {
        id: providerResult.externalId,
      },
    });
  });

  it("sends templates with stable variable ordering and template capabilities", async () => {
    const effect = fixture({
      action: "message.send_template",
      payload: {
        language: "pt_BR",
        templateName: "vehicle_follow_up",
        variables: { second: "B", first: "A" },
      },
    });
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    const sendTemplate = vi.fn().mockResolvedValue(providerResult);
    const executor = createExecutor(vi.fn(), { sendTemplate });

    await expect(executor.execute(workerInput())).resolves.toMatchObject({
      kind: "succeeded",
    });
    expect(resolveCrmProviderOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredCapabilities: ["outbound", "templates"],
      }),
    );
    expect(sendTemplate).toHaveBeenCalledWith(expect.anything(), {
      components: [
        {
          parameters: [
            { text: "A", type: "text" },
            { text: "B", type: "text" },
          ],
          type: "body",
        },
      ],
      languageCode: "pt_BR",
      name: "vehicle_follow_up",
      phone: "5511999999999",
    });
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
});
