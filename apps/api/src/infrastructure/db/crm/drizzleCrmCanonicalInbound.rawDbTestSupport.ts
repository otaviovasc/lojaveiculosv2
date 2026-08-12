import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { eq } from "drizzle-orm";
import { expect } from "vitest";
import type {
  CanonicalInboundMessageInput,
  CanonicalInboundMessageResult,
  CrmCanonicalInboundRepository,
} from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

type TestScope = { storeId: string; tenantId: string };

export async function validateOlxCanonicalInbound(
  transaction: DrizzleCrmClient,
  repository: CrmCanonicalInboundRepository,
  input: {
    scope: TestScope;
    zapiFirst: CanonicalInboundMessageResult;
    zapiPhone: string;
  },
) {
  const olxConnectionId = randomUUID();
  const olxInput = {
    ...canonicalInbound({
      channel: "olx_chat",
      connectionDisplayName: "Raw OLX canonical validation",
      connectionId: olxConnectionId,
      externalThreadId: `olx-thread-${randomUUID()}`,
      identity: {
        kind: "provider_subject" as const,
        normalizedValue: `olx-buyer-${randomUUID()}`,
      },
      provider: "olx",
      providerMessageId: `olx-message-${randomUUID()}`,
      scope: input.scope,
    }),
    secondaryPhone: input.zapiPhone,
  };
  const olxFirst = await repository.ingestInboundMessage(olxInput);
  const olxReplay = await repository.ingestInboundMessage(olxInput);
  expect(olxFirst.created).toBe(true);
  expect(olxReplay).toMatchObject({
    contactId: olxFirst.contactId,
    cycleId: olxFirst.cycleId,
    threadId: olxFirst.threadId,
    created: false,
  });
  expect(olxFirst.contactId).not.toBe(input.zapiFirst.contactId);
  const olxIdentities = await transaction
    .select({
      contactId: schema.contactIdentities.contactId,
      kind: schema.contactIdentities.identityKind,
      state: schema.contactIdentities.state,
    })
    .from(schema.contactIdentities)
    .where(eq(schema.contactIdentities.provider, "olx"));
  expect(olxIdentities).toEqual(
    expect.arrayContaining([
      { contactId: null, kind: "provider_subject", state: "observed" },
      { contactId: null, kind: "phone", state: "candidate" },
    ]),
  );

  const [olxConnection] = await transaction
    .select({
      broker: schema.providerConnections.broker,
      channel: schema.providerConnections.channel,
      provider: schema.providerConnections.provider,
    })
    .from(schema.providerConnections)
    .where(eq(schema.providerConnections.id, olxConnectionId));
  expect(olxConnection).toEqual({
    broker: "direct",
    channel: "olx_chat",
    provider: "olx",
  });
}

export function canonicalInbound(input: {
  channel: CanonicalInboundMessageInput["channel"];
  connectionDisplayName: string;
  connectionId: string;
  externalThreadId: string;
  identity: CanonicalInboundMessageInput["identity"];
  provider: CanonicalInboundMessageInput["provider"];
  providerMessageId: string;
  scope: TestScope;
}): CanonicalInboundMessageInput {
  return {
    channel: input.channel,
    connectionCapabilities: {
      inbound: true,
      outbound: true,
      templates: false,
    },
    connectionDisplayName: input.connectionDisplayName,
    connectionId: input.connectionId,
    contactDisplayName: "Raw canonical validation contact",
    content: "First inbound message",
    externalThreadId: input.externalThreadId,
    externalThreadAliases: [],
    identity: input.identity,
    occurredAt: new Date("2026-08-12T12:00:00.000Z"),
    mediaType: input.provider === "zapi" ? "image" : null,
    mediaUrl: input.provider === "zapi" ? "https://media.test/image.jpg" : null,
    messageType: input.provider === "zapi" ? "image" : "text",
    metadata: { provider: input.provider },
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    secondaryPhone: null,
    sender: "customer",
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
  };
}

export function isMissingRelation(error: unknown) {
  return (error as { code?: string }).code === "42P01";
}
