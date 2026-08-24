import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createExternalBotEffectExecutor as createExecutor,
  externalBotEffectFixture as fixture,
  externalBotProviderResult as providerResult,
  externalBotWorkerInput as workerInput,
} from "./externalBotProviderEffectExecutor.testSupport.js";

vi.mock("../../db/crm/drizzleExternalBotEffectRuntime.js", () => ({
  ExternalBotCanonicalSyncIndeterminateError: class extends Error {},
  loadAuthorizedExternalBotEffect: vi.fn(),
  persistPreparedExternalBotMedia: vi.fn(async () => undefined),
  synchronizeExternalBotEffectOutcome: vi.fn(),
  wasExternalBotProviderAttempted: vi.fn(),
}));

vi.mock(
  "../../../domains/crm/services/CrmRoutingService/resolveCrmProviderOperation.js",
  () => ({ resolveCrmProviderOperation: vi.fn() }),
);

import {
  loadAuthorizedExternalBotEffect,
  persistPreparedExternalBotMedia,
  synchronizeExternalBotEffectOutcome,
  wasExternalBotProviderAttempted,
} from "../../db/crm/drizzleExternalBotEffectRuntime.js";
import { resolveCrmProviderOperation } from "../../../domains/crm/services/CrmRoutingService/resolveCrmProviderOperation.js";

describe("external bot media provider effect", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(synchronizeExternalBotEffectOutcome).mockResolvedValue(undefined);
    vi.mocked(wasExternalBotProviderAttempted).mockResolvedValue(false);
    vi.mocked(resolveCrmProviderOperation).mockResolvedValue(
      fixture({ action: "message.send_text", payload: { text: "fixture" } })
        .connection,
    );
  });

  it("mirrors media before the provider attempt and sends the durable URL", async () => {
    const originalUrl =
      "https://provider.example.com/signed/audio.mp3?expires=1";
    const effect = fixture({
      action: "message.send_media",
      payload: {
        caption: "Voice reply",
        mediaType: "audio",
        mediaUrl: originalUrl,
      },
    });
    const preparedEffect = {
      ...effect,
      command: {
        action: "message.send_media" as const,
        payload: {
          caption: "Voice reply",
          mediaType: "audio",
          mediaUrl: "https://cdn.example.com/crm/bot/effect-1/audio.mp3",
        },
      },
      preparedMedia: {
        contentType: "audio/mpeg",
        originalUrl,
        publicUrl: "https://cdn.example.com/crm/bot/effect-1/audio.mp3",
        sizeBytes: 3,
        storageKey: "staging/crm/bot/effect-1/audio.mp3",
      },
    };
    vi.mocked(loadAuthorizedExternalBotEffect)
      .mockResolvedValueOnce(effect)
      .mockResolvedValueOnce(preparedEffect);
    const fetchMedia = vi.fn().mockResolvedValue({
      body: new Uint8Array([1, 2, 3]),
      contentType: "audio/mpeg",
      finalUrl: originalUrl,
    });
    const putObject = vi.fn().mockResolvedValue({
      publicUrl: preparedEffect.preparedMedia.publicUrl,
      storageKey: preparedEffect.preparedMedia.storageKey,
    });
    const sendMedia = vi.fn().mockResolvedValue(providerResult);

    await expect(
      createExecutor(vi.fn(), {
        mediaFetcher: { fetchMedia, validateUrl: vi.fn() },
        mediaStorage: { putObject },
        sendMedia,
      }).execute(workerInput()),
    ).resolves.toMatchObject({ kind: "succeeded" });

    expect(loadAuthorizedExternalBotEffect).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      "effect-1",
      { markProviderAttempt: false },
    );
    expect(loadAuthorizedExternalBotEffect).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      "effect-1",
    );
    expect(fetchMedia).toHaveBeenCalledWith({
      maxBytes: 25 * 1024 * 1024,
      url: originalUrl,
    });
    expect(putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        body: new Uint8Array([1, 2, 3]),
        contentType: "audio/mpeg",
        idempotencyKey: "effect-1",
        scopeSegments: [
          "crm",
          "whatsapp",
          "tenant-1",
          "store-1",
          "connection-1",
          "cycle-1",
          "outbound",
          "external-bot",
          "effect-1",
        ],
      }),
    );
    expect(sendMedia).toHaveBeenCalledWith(expect.anything(), {
      caption: "Voice reply",
      mediaType: "audio",
      mediaUrl: preparedEffect.preparedMedia.publicUrl,
      phone: "5511999999999",
    });
    expect(synchronizeExternalBotEffectOutcome).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ effect: preparedEffect }),
    );
  });

  it("does not mirror when a previous provider attempt is indeterminate", async () => {
    const effect = fixture({
      action: "message.send_media",
      payload: {
        mediaType: "audio",
        mediaUrl: "https://provider.example.com/signed/audio.mp3",
      },
    });
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    vi.mocked(wasExternalBotProviderAttempted).mockResolvedValue(true);
    const fetchMedia = vi.fn();
    const sendMedia = vi.fn();

    await expect(
      createExecutor(vi.fn(), {
        mediaFetcher: { fetchMedia, validateUrl: vi.fn() },
        mediaStorage: { putObject: vi.fn() },
        sendMedia,
      }).execute(workerInput()),
    ).resolves.toEqual({
      code: "provider_attempt_indeterminate",
      kind: "indeterminate",
    });

    expect(fetchMedia).not.toHaveBeenCalled();
    expect(sendMedia).not.toHaveBeenCalled();
  });

  it("reuses prepared media without downloading or uploading it again", async () => {
    const preparedEffect = {
      ...fixture({
        action: "message.send_media" as const,
        payload: {
          mediaType: "audio",
          mediaUrl: "https://cdn.example.com/crm/bot/effect-1/audio.mp3",
        },
      }),
      preparedMedia: {
        contentType: "audio/mpeg",
        originalUrl: "https://provider.example.com/signed/audio.mp3",
        publicUrl: "https://cdn.example.com/crm/bot/effect-1/audio.mp3",
        sizeBytes: 3,
        storageKey: "staging/crm/bot/effect-1/audio.mp3",
      },
    };
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(
      preparedEffect,
    );
    const fetchMedia = vi.fn();
    const putObject = vi.fn();
    const sendMedia = vi.fn().mockResolvedValue(providerResult);

    await expect(
      createExecutor(vi.fn(), {
        mediaFetcher: { fetchMedia, validateUrl: vi.fn() },
        mediaStorage: { putObject },
        sendMedia,
      }).execute(workerInput()),
    ).resolves.toMatchObject({ kind: "succeeded" });

    expect(fetchMedia).not.toHaveBeenCalled();
    expect(putObject).not.toHaveBeenCalled();
    expect(sendMedia).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mediaUrl: preparedEffect.preparedMedia.publicUrl,
      }),
    );
  });

  it("does not delete an idempotent object when another worker persisted it", async () => {
    const originalUrl = "https://provider.example.com/signed/audio.mp3";
    const effect = fixture({
      action: "message.send_media",
      payload: {
        mediaType: "audio",
        mediaUrl: originalUrl,
      },
    });
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    vi.mocked(persistPreparedExternalBotMedia).mockRejectedValueOnce(
      Object.assign(new Error("Preparation already persisted."), {
        code: "media_preparation_conflict",
      }),
    );
    const deleteObject = vi.fn();
    await expect(
      createExecutor(vi.fn(), {
        mediaFetcher: {
          fetchMedia: vi.fn().mockResolvedValue({
            body: new Uint8Array([1, 2, 3]),
            contentType: "audio/mpeg",
            finalUrl: originalUrl,
          }),
          validateUrl: vi.fn(),
        },
        mediaStorage: {
          deleteObject,
          putObject: vi.fn().mockResolvedValue({
            publicUrl: "https://cdn.example.com/audio.mp3",
            storageKey: "staging/crm/audio.mp3",
          }),
        },
      }).execute(workerInput()),
    ).resolves.toEqual({
      code: "media_preparation_conflict",
      kind: "failed",
      retryable: false,
    });

    expect(deleteObject).not.toHaveBeenCalled();
  });
});
