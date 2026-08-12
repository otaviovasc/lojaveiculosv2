import { describe, expect, it } from "vitest";
import { createMemoryCrmWhatsappOutboundIntentRepository } from "../adapters/memory/crmWhatsappOutboundIntentRepository.js";
import { claimInput } from "./crm.whatsapp.outboundIdempotency.testSupport.js";

describe("CRM WhatsApp outbound intent repository", () => {
  it("never reclaims a stale ambiguous provider attempt", async () => {
    const intents = createMemoryCrmWhatsappOutboundIntentRepository();
    const first = await intents.claim(
      claimInput(new Date("2026-08-10T10:00:00Z")),
    );
    const stale = await intents.claim(
      claimInput(new Date("2026-08-10T10:03:00Z")),
    );
    expect(first.kind).toBe("claimed");
    expect(stale.kind).toBe("indeterminate");
  });

  it("grants only one provider claim to concurrent callers", async () => {
    const intents = createMemoryCrmWhatsappOutboundIntentRepository();
    const now = new Date("2026-08-10T10:00:00Z");
    const results = await Promise.all([
      intents.claim(claimInput(now)),
      intents.claim(claimInput(now)),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual([
      "claimed",
      "in_progress",
    ]);
  });

  it("reclaims a retryable failure with a fresh provider claim", async () => {
    const intents = createMemoryCrmWhatsappOutboundIntentRepository();
    const first = await intents.claim(
      claimInput(new Date("2026-08-10T10:00:00Z")),
    );
    if (first.kind !== "claimed") throw new Error("expected claim");
    const firstClaimToken = first.intent.claimToken;
    await intents.recordProviderFailure({
      claimToken: firstClaimToken,
      failure: { code: "rate_limited", status: 429 },
      id: first.intent.id,
      retryable: true,
    });
    const retried = await intents.claim(
      claimInput(new Date("2026-08-10T10:01:00Z")),
    );
    expect(retried.kind).toBe("claimed");
    if (retried.kind === "claimed") {
      expect(retried.intent.claimToken).not.toBe(firstClaimToken);
      expect(retried.intent.providerResult).toBeNull();
    }
  });

  it("keeps a deterministic provider failure terminal", async () => {
    const intents = createMemoryCrmWhatsappOutboundIntentRepository();
    const first = await intents.claim(
      claimInput(new Date("2026-08-10T10:00:00Z")),
    );
    if (first.kind !== "claimed") throw new Error("expected claim");
    await intents.recordProviderFailure({
      claimToken: first.intent.claimToken,
      failure: { code: "provider_rejected", status: 502 },
      id: first.intent.id,
      retryable: false,
    });
    const repeated = await intents.claim(
      claimInput(new Date("2026-08-10T10:03:00Z")),
    );
    expect(repeated.kind).toBe("failed");
  });

  it("minimizes the recovery payload after local completion", async () => {
    const intents = createMemoryCrmWhatsappOutboundIntentRepository();
    const now = new Date("2026-08-10T10:00:00Z");
    const claimed = await intents.claim(claimInput(now));
    if (claimed.kind !== "claimed") throw new Error("expected claim");
    await intents.recordProviderSuccess({
      claimToken: claimed.intent.claimToken,
      id: claimed.intent.id,
      providerResult: {
        externalId: "provider_1",
        providerTimestamp: now.toISOString(),
      },
    });
    await intents.complete({
      claimToken: claimed.intent.claimToken,
      id: claimed.intent.id,
      messageId: "message_1",
      sessionId: "session_1",
    });
    const completed = await intents.claim(claimInput(now));
    expect(completed.kind).toBe("completed");
    if (completed.kind === "completed") {
      expect(completed.intent.providerResult).toEqual({
        externalId: "provider_1",
        providerTimestamp: now.toISOString(),
      });
      expect(Object.keys(completed.intent.providerResult ?? {})).toHaveLength(
        2,
      );
    }
  });

  it("expires abandoned recovery payloads after bounded retention", async () => {
    const intents = createMemoryCrmWhatsappOutboundIntentRepository();
    const claimed = await intents.claim(claimInput(new Date()));
    if (claimed.kind !== "claimed") throw new Error("expected claim");
    await intents.recordProviderSuccess({
      claimToken: claimed.intent.claimToken,
      id: claimed.intent.id,
      providerResult: {
        externalId: "provider_1",
        providerTimestamp: new Date().toISOString(),
      },
    });
    expect(
      await intents.purgeExpiredRecoveryPayloads({
        limit: 10,
        now: new Date(Date.now() + 8 * 24 * 60 * 60_000),
      }),
    ).toBe(1);
    const expired = await intents.claim(claimInput(new Date()));
    expect(expired.kind).toBe("indeterminate");
    if (expired.kind === "indeterminate") {
      expect(expired.intent.providerResult).toBeNull();
    }
  });
});
