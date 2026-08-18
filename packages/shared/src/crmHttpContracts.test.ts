import { describe, expect, it } from "vitest";
import {
  crmConnectionOverviewSchema,
  crmConversationCycleCountsResponseSchema,
  crmConversationCycleListResponseSchema,
  crmHttpErrorEnvelopeSchema,
  crmHttpSuccessEnvelopeSchema,
  crmMessageListResponseSchema,
} from "./crmHttpContracts.js";

describe("CRM stable HTTP envelopes", () => {
  it("parses strict success metadata", () => {
    const input = {
      code: "CRM_BOT_ACTION_ACCEPTED",
      message: "Action accepted.",
      providerOperationId: null,
      requestId: "request_1",
    };
    expect(crmHttpSuccessEnvelopeSchema.parse(input)).toEqual(input);
    expect(
      crmHttpSuccessEnvelopeSchema.safeParse({ ...input, success: true })
        .success,
    ).toBe(false);
  });

  it("supports safe retry and provider diagnostics on errors", () => {
    const input = {
      code: "CRM_PROVIDER_UNAVAILABLE",
      details: { phase: "dispatch" },
      message: "Provider is unavailable.",
      providerOperationId: "operation_1",
      requestId: "request_1",
      retryable: true,
    };
    expect(crmHttpErrorEnvelopeSchema.parse(input)).toEqual(input);
    expect(
      crmHttpErrorEnvelopeSchema.safeParse({ ...input, error: "raw error" })
        .success,
    ).toBe(false);
  });
});

describe("canonical CRM read contracts", () => {
  const connection = {
    capabilities: ["inbound", "outbound", "text"],
    channel: "whatsapp",
    displayName: "WhatsApp Oficial",
    id: "connection_1",
    isDefault: true,
    provider: "meta_cloud",
    readiness: { ready: true, reason: null, reasonCode: "ready" },
    state: "active",
  } as const;

  it("keeps setup channel, provider and broker explicit", () => {
    const overview = {
      allowance: { limit: 2, remaining: 1, used: 1 },
      availableSetups: [
        {
          broker: "composio",
          channel: "instagram",
          provider: "meta_cloud",
        },
      ],
      connections: [connection],
    };
    expect(crmConnectionOverviewSchema.parse(overview)).toEqual(overview);
    expect(
      crmConnectionOverviewSchema.safeParse({
        ...overview,
        obsoleteProviderList: ["meta_cloud"],
      }).success,
    ).toBe(false);
  });

  it("rejects malformed cycles and unknown sender origins", () => {
    const cycle = {
      channel: "instagram",
      id: "cycle_1",
      revision: 3,
      status: "ACTIVE",
    };
    expect(crmConversationCycleListResponseSchema.parse([cycle])).toEqual([
      cycle,
    ]);
    expect(
      crmConversationCycleListResponseSchema.safeParse([
        { ...cycle, revision: "3" },
      ]).success,
    ).toBe(false);

    const message = {
      channel: "instagram",
      content: "Olá",
      createdAt: "2026-08-18T12:00:00.000Z",
      direction: "INBOUND",
      id: "message_1",
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      type: "TEXT",
    };
    expect(crmMessageListResponseSchema.parse([message])).toEqual([message]);
    expect(
      crmMessageListResponseSchema.safeParse([
        { ...message, senderOrigin: "human_whatsapp" },
      ]).success,
    ).toBe(false);
  });

  it("requires complete count buckets and rejects extra fields", () => {
    const counts = {
      assignees: [{ assigneeId: "user_1", count: 1 }],
      filters: { all: 1, fresh: 0, mine: 1, others: 0, unassigned: 0 },
      inHumanService: 0,
      statuses: {
        ACTIVE: 1,
        COMPLETED: 0,
        EXPIRED: 0,
        HUMAN_TAKEOVER: 0,
        MINIBOT_ACTIVE: 0,
      },
      total: 1,
      unread: 1,
      waitingHuman: 0,
    };
    expect(crmConversationCycleCountsResponseSchema.parse(counts)).toEqual(
      counts,
    );
    expect(
      crmConversationCycleCountsResponseSchema.safeParse({
        ...counts,
        legacyTotal: 1,
      }).success,
    ).toBe(false);
  });
});
