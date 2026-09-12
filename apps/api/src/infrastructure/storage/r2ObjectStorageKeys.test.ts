import { describe, expect, it } from "vitest";
import { createR2StorageKey } from "./r2ObjectStorageKeys.js";

describe("createR2StorageKey", () => {
  it("uses a stable key when an idempotency key is provided", () => {
    const input = {
      fileName: "Audio Reply.MP3",
      idempotencyKey: "effect-123",
      scopeSegments: ["crm", "external-bot"],
    };

    expect(createR2StorageKey(input, "first-random-id", "s")).toBe(
      "s/crm/external-bot/effect-123-audio-reply.mp3",
    );
    expect(createR2StorageKey(input, "second-random-id", "s")).toBe(
      "s/crm/external-bot/effect-123-audio-reply.mp3",
    );
  });
});
