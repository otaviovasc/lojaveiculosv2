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

type CanonicalInboundProvider =
  | { channel: "whatsapp"; provider: "zapi" }
  | { channel: "olx_chat"; provider: "olx" };

export async function seedCanonicalInboundConnection(
  transaction: DrizzleCrmClient,
  input: CanonicalInboundProvider & {
    connectionId: string;
    inbound?: boolean;
    scope: TestScope;
    state?: typeof schema.crmChannelConnections.$inferInsert.state;
  },
) {
  await transaction.insert(schema.crmChannelConnections).values({
    broker: "direct",
    channel: input.channel,
    displayName: `Raw canonical ${input.provider} inbound`,
    id: input.connectionId,
    metadata: {
      capabilities: {
        inbound: input.inbound ?? true,
        outbound: true,
        templates: false,
      },
      connected: true,
    },
    provider: input.provider,
    state: input.state ?? "active",
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
  });
}

export async function expectRejectedCanonicalConnectionStates(
  transaction: DrizzleCrmClient,
  repository: CrmCanonicalInboundRepository,
  zapiInput: CanonicalInboundMessageInput,
  scope: TestScope,
) {
  const disconnectedConnectionId = randomUUID();
  await seedCanonicalInboundConnection(transaction, {
    channel: "whatsapp",
    connectionId: disconnectedConnectionId,
    provider: "zapi",
    scope,
    state: "disconnected",
  });
  await expect(
    repository.ingestInboundMessage({
      ...zapiInput,
      connectionId: disconnectedConnectionId,
      providerMessageId: `zapi-disconnected-${randomUUID()}`,
    }),
  ).rejects.toThrow("not ready for inbound messaging");

  const missingInboundConnectionId = randomUUID();
  await seedCanonicalInboundConnection(transaction, {
    channel: "whatsapp",
    connectionId: missingInboundConnectionId,
    inbound: false,
    provider: "zapi",
    scope,
  });
  await expect(
    repository.ingestInboundMessage({
      ...zapiInput,
      connectionId: missingInboundConnectionId,
      providerMessageId: `zapi-missing-inbound-${randomUUID()}`,
    }),
  ).rejects.toThrow("not ready for inbound messaging");
}

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
  await seedCanonicalInboundConnection(transaction, {
    channel: "olx_chat",
    connectionId: olxConnectionId,
    provider: "olx",
    scope: input.scope,
  });
  const olxInput = {
    ...canonicalInbound({
      channel: "olx_chat",
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
  const profilePhotoStorageKey = `crm/profiles/${randomUUID()}.jpg`;
  const profilePhotoUrl = `https://media.test/${profilePhotoStorageKey}`;
  const olxReplay = await repository.ingestInboundMessage({
    ...olxInput,
    profilePhotoStorageKey,
    profilePhotoUrl,
  });
  expect(olxFirst.created).toBe(true);
  expect(olxReplay).toMatchObject({
    contactId: olxFirst.contactId,
    cycleId: olxFirst.cycleId,
    threadId: olxFirst.threadId,
    created: false,
  });
  expect(olxFirst.contactId).not.toBe(input.zapiFirst.contactId);
  const [olxThread] = await transaction
    .select({
      metadata: schema.conversationThreads.metadata,
      profilePhotoUrl: schema.conversationThreads.profilePhotoUrl,
    })
    .from(schema.conversationThreads)
    .where(eq(schema.conversationThreads.id, olxFirst.threadId));
  expect(olxThread).toEqual({
    metadata: {
      profilePhoto: { storageKey: profilePhotoStorageKey },
      unreadCount: 1,
    },
    profilePhotoUrl,
  });
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
      broker: schema.crmChannelConnections.broker,
      channel: schema.crmChannelConnections.channel,
      metadata: schema.crmChannelConnections.metadata,
      provider: schema.crmChannelConnections.provider,
    })
    .from(schema.crmChannelConnections)
    .where(eq(schema.crmChannelConnections.id, olxConnectionId));
  expect(olxConnection).toEqual({
    broker: "direct",
    channel: "olx_chat",
    metadata: {
      capabilities: { inbound: true, outbound: true, templates: false },
      connected: true,
    },
    provider: "olx",
  });
}

export function canonicalInbound(input: {
  channel: CanonicalInboundMessageInput["channel"];
  connectionId: string;
  externalThreadId: string;
  identity: CanonicalInboundMessageInput["identity"];
  provider: CanonicalInboundMessageInput["provider"];
  providerMessageId: string;
  scope: TestScope;
}): CanonicalInboundMessageInput {
  return {
    channel: input.channel,
    connectionId: input.connectionId,
    contactDisplayName: "Raw canonical validation contact",
    content: "First inbound message",
    customerChatId: null,
    externalThreadId: input.externalThreadId,
    externalThreadAliases: [],
    identity: input.identity,
    leadId: null,
    occurredAt: new Date("2026-08-12T12:00:00.000Z"),
    mediaType: input.provider === "zapi" ? "image" : null,
    mediaUrl: input.provider === "zapi" ? "https://media.test/image.jpg" : null,
    messageType: input.provider === "zapi" ? "image" : "text",
    metadata: { provider: input.provider },
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    profilePhotoStorageKey: null,
    profilePhotoUrl: null,
    secondaryPhone: null,
    sender: "customer",
    senderOrigin: "customer",
    cycleMetadata: {},
    source: input.provider === "olx" ? "olx" : "whatsapp",
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
  };
}

export function isMissingRelation(error: unknown) {
  return (error as { code?: string }).code === "42P01";
}
