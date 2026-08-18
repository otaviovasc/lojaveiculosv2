import * as schema from "@lojaveiculosv2/db";
import { eq } from "drizzle-orm";
import { expect } from "vitest";
import type { CanonicalInboundMessageResult } from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function expectCanonicalZapiState(
  transaction: DrizzleCrmClient,
  input: {
    connectionId: string;
    first: CanonicalInboundMessageResult;
    phone: string;
    scope: { storeId: string; tenantId: string };
  },
) {
  const [connection] = await transaction
    .select({
      broker: schema.providerConnections.broker,
      channel: schema.providerConnections.channel,
      metadata: schema.providerConnections.metadata,
      provider: schema.providerConnections.provider,
    })
    .from(schema.providerConnections)
    .where(eq(schema.providerConnections.id, input.connectionId));
  expect(connection).toEqual({
    broker: "direct",
    channel: "whatsapp",
    metadata: {
      capabilities: {
        inbound: true,
        outbound: true,
        templates: false,
      },
      connected: true,
    },
    provider: "zapi",
  });

  const [identity] = await transaction
    .select({
      channel: schema.contactIdentities.channel,
      contactId: schema.contactIdentities.contactId,
      normalizedValue: schema.contactIdentities.normalizedValue,
      provider: schema.contactIdentities.provider,
      state: schema.contactIdentities.state,
      storeId: schema.contactIdentities.storeId,
      tenantId: schema.contactIdentities.tenantId,
    })
    .from(schema.contactIdentities)
    .where(eq(schema.contactIdentities.id, input.first.identityId));
  expect(identity).toEqual({
    channel: "whatsapp",
    contactId: null,
    normalizedValue: input.phone,
    provider: "zapi",
    state: "observed",
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
  });
  expect(identity?.contactId).toBeNull();
  const [candidate] = await transaction
    .select({ contactId: schema.contactIdentityCandidates.contactId })
    .from(schema.contactIdentityCandidates)
    .where(
      eq(schema.contactIdentityCandidates.identityId, input.first.identityId),
    );
  expect(candidate?.contactId).toBe(input.first.contactId);

  const [thread] = await transaction
    .select({
      metadata: schema.conversationThreads.metadata,
      state: schema.conversationThreads.state,
    })
    .from(schema.conversationThreads)
    .where(eq(schema.conversationThreads.id, input.first.threadId));
  expect(thread?.state).toBe("open");
  expect((thread?.metadata as { unreadCount?: number }).unreadCount).toBe(1);

  const [attendance] = await transaction
    .select({ state: schema.conversationAttendances.state })
    .from(schema.conversationAttendances)
    .where(eq(schema.conversationAttendances.cycleId, input.first.cycleId));
  expect(attendance?.state).toBe("handoff_requested");

  const messages = await transaction
    .select({
      id: schema.canonicalMessages.id,
      mediaType: schema.canonicalMessages.mediaType,
      mediaUrl: schema.canonicalMessages.mediaUrl,
      messageType: schema.canonicalMessages.messageType,
      metadata: schema.canonicalMessages.metadata,
    })
    .from(schema.canonicalMessages)
    .where(
      eq(schema.canonicalMessages.providerConnectionId, input.connectionId),
    );
  expect(messages).toHaveLength(2);
  expect(messages).toContainEqual(
    expect.objectContaining({
      mediaType: "image",
      mediaUrl: "https://media.test/image.jpg",
      messageType: "image",
      metadata: { providerMetadata: { provider: "zapi" } },
    }),
  );

  const [cycle] = await transaction
    .select({ opportunityId: schema.conversationCycles.opportunityId })
    .from(schema.conversationCycles)
    .where(eq(schema.conversationCycles.id, input.first.cycleId));
  expect(cycle?.opportunityId).toBeNull();
}
