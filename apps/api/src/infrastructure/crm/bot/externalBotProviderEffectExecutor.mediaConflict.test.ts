import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createExternalBotEffectExecutor as createExecutor,
  externalBotEffectFixture as fixture,
  externalBotWorkerInput as workerInput,
} from "./externalBotProviderEffectExecutor.testSupport.js";

vi.mock("../../db/crm/drizzleExternalBotEffectRuntime.js", () => ({
  ExternalBotCanonicalSyncIndeterminateError: class extends Error {},
  loadAuthorizedExternalBotEffect: vi.fn(),
  persistPreparedExternalBotMedia: vi.fn(),
  synchronizeExternalBotEffectOutcome: vi.fn(),
  wasExternalBotProviderAttempted: vi.fn(),
}));

import {
  loadAuthorizedExternalBotEffect,
  persistPreparedExternalBotMedia,
  wasExternalBotProviderAttempted,
} from "../../db/crm/drizzleExternalBotEffectRuntime.js";

describe("external bot media preparation conflicts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(wasExternalBotProviderAttempted).mockResolvedValue(false);
  });

  it("does not delete an idempotent object when another worker persisted it", async () => {
    const originalUrl = "https://provider.example.com/signed/audio.webm";
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(
      fixture({
        action: "message.send_media",
        payload: { mediaType: "audio", mediaUrl: originalUrl },
      }),
    );
    vi.mocked(persistPreparedExternalBotMedia).mockRejectedValueOnce(
      Object.assign(new Error("Preparation already persisted."), {
        code: "media_preparation_conflict",
      }),
    );
    const deleteObject = vi.fn();

    await expect(
      createExecutor(vi.fn(), {
        audioNormalizer: {
          normalizeToOggOpus: vi.fn(
            async () => new Uint8Array([79, 103, 103, 83]),
          ),
        },
        mediaFetcher: {
          fetchMedia: vi.fn().mockResolvedValue({
            body: new Uint8Array([1, 2, 3]),
            contentType: "audio/webm",
            finalUrl: originalUrl,
          }),
          validateUrl: vi.fn(),
        },
        mediaStorage: {
          deleteObject,
          putObject: vi.fn().mockResolvedValue({
            publicUrl: "https://cdn.example.com/audio.ogg",
            storageKey: "staging/crm/audio.ogg",
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
