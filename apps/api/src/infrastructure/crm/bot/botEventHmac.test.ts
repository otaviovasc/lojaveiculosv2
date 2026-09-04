import { describe, expect, it } from "vitest";
import {
  createMemoryExternalBotNonceStore,
  signExternalBotEvent,
  verifyExternalBotEventSignature,
} from "./botEventHmac.js";

describe("external bot event signature", () => {
  it("accepts once and rejects nonce replay", async () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    const signed = signExternalBotEvent({
      body: '{"eventId":"one"}',
      nonce: "nonce-one",
      now,
      secret: "delivery-signing-key",
    });
    const nonceStore = createMemoryExternalBotNonceStore();
    const input = {
      ...signed,
      nonceStore,
      now,
      secret: "delivery-signing-key",
    };
    expect(await verifyExternalBotEventSignature(input)).toEqual({
      kind: "verified",
    });
    expect(await verifyExternalBotEventSignature(input)).toEqual({
      kind: "replay",
    });
  });

  it("rejects timestamps outside the replay window", async () => {
    const signed = signExternalBotEvent({
      body: "{}",
      now: new Date("2026-08-12T11:50:00.000Z"),
      secret: "delivery-signing-key",
    });
    expect(
      await verifyExternalBotEventSignature({
        ...signed,
        nonceStore: createMemoryExternalBotNonceStore(),
        now: new Date("2026-08-12T12:00:00.000Z"),
        secret: "delivery-signing-key",
      }),
    ).toEqual({ kind: "expired" });
  });
});
