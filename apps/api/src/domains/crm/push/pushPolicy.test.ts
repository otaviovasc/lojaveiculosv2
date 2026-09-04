import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { CrmPushRecipientCandidate } from "../ports/crmPushRepository.js";
import {
  buildCrmPushIntentIdempotencyKey,
  buildCrmPushPayload,
  buildCrmPushPreview,
  resolveCrmPushRecipients,
} from "./pushPolicy.js";

describe("CRM push payload policy", () => {
  it("preserves the V1 heading, preview, TTL and cycle topic", () => {
    const payload = buildCrmPushPayload({
      buyerName: "  Maria  ",
      connectionId: "connection_1",
      content: `  ${"a".repeat(101)}  `,
      cycleId: "cycle_1",
      iconUrl: "https://lojaveiculos.com.br/avatar.png",
      idempotencyKey: "11111111-1111-5111-a111-111111111111",
      messageType: "text",
      storeSlug: "loja-teste",
      subscriptionIds: ["subscription_1"],
      traceId: "trace_1",
      webUrl: "https://lojaveiculos.com.br/crm?cycleId=cycle_1",
    });

    expect(payload).toMatchObject({
      body: "a".repeat(100),
      heading: "Maria",
      subscriptionIds: ["subscription_1"],
      topic: `crm-${createHash("sha256").update("cycle_1").digest("hex").slice(0, 16)}`,
      ttlSeconds: 86_400,
    });
  });

  it.each([
    ["image", "Imagem"],
    ["audio", "Audio"],
    ["video", "Video"],
    ["document", "Documento"],
    ["sticker", "Figurinha"],
    ["location", "Localizacao"],
    ["contact", "Contato"],
    ["reaction", "Nova mensagem"],
  ])("uses the V1 %s fallback label", (messageType, expected) => {
    expect(buildCrmPushPreview(null, messageType)).toBe(expected);
  });

  it("builds a stable scoped UUID idempotency key", () => {
    const input = {
      cycleId: "cycle_1",
      messageId: "message_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    };
    expect(buildCrmPushIntentIdempotencyKey(input)).toBe(
      buildCrmPushIntentIdempotencyKey(input),
    );
    expect(buildCrmPushIntentIdempotencyKey(input)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("CRM push recipient policy", () => {
  it("does not fan out when the assigned user is muted", () => {
    const recipients = resolveCrmPushRecipients({
      assignedUserId: "assigned",
      candidates: [
        candidate({ preferenceEnabled: false, userId: "assigned" }),
        candidate({
          hasGlobalQueueVisibility: true,
          subscriptionIds: ["other-subscription"],
          userId: "other",
        }),
      ],
    });
    expect(recipients).toEqual({ subscriptionIds: [], userIds: [] });
  });

  it("fans unassigned messages out only to eligible global users", () => {
    const recipients = resolveCrmPushRecipients({
      assignedUserId: null,
      candidates: [
        candidate({
          hasGlobalQueueVisibility: true,
          subscriptionIds: ["shared", "first"],
          userId: "first-user",
        }),
        candidate({ subscriptionIds: ["assigned-only"], userId: "second" }),
        candidate({
          hasGlobalQueueVisibility: true,
          subscriptionIds: ["shared", "third"],
          userId: "third-user",
        }),
      ],
    });
    expect(recipients).toEqual({
      subscriptionIds: ["first", "shared", "third"],
      userIds: ["first-user", "third-user"],
    });
  });
});

function candidate(
  patch: Partial<CrmPushRecipientCandidate>,
): CrmPushRecipientCandidate {
  return {
    activeMembership: true,
    canReadConversations: true,
    hasGlobalQueueVisibility: false,
    preferenceEnabled: true,
    subscriptionIds: ["subscription"],
    userId: "user",
    ...patch,
  };
}
