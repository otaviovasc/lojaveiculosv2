import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { eq } from "drizzle-orm";
import { expect } from "vitest";
import type { CanonicalInboundMessageResult } from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { CrmCanonicalInboundRepository } from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { canonicalInbound } from "./drizzleCrmCanonicalInbound.rawDbTestSupport.js";
import { seedCanonicalContext } from "./drizzleCrmCanonicalInboundRegressionSeeds.rawDbTestSupport.js";

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
      broker: schema.crmChannelConnections.broker,
      channel: schema.crmChannelConnections.channel,
      metadata: schema.crmChannelConnections.metadata,
      provider: schema.crmChannelConnections.provider,
    })
    .from(schema.crmChannelConnections)
    .where(eq(schema.crmChannelConnections.id, input.connectionId));
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
      credentialsRef: {
        stored: {
          clientToken: "raw-test-client-token",
          instanceId: "raw-test-instance",
          instanceToken: "raw-test-instance-token",
        },
      },
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
      id: schema.crmMessages.id,
      mediaType: schema.crmMessages.mediaType,
      mediaUrl: schema.crmMessages.mediaUrl,
      messageType: schema.crmMessages.messageType,
      metadata: schema.crmMessages.metadata,
    })
    .from(schema.crmMessages)
    .where(eq(schema.crmMessages.providerConnectionId, input.connectionId));
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

export async function expectArchivedHuskIgnored(
  db: DrizzleCrmClient,
  repository: CrmCanonicalInboundRepository,
  input: { connectionId: string; scope: { storeId: string; tenantId: string } },
) {
  const phone = `5511${randomUUID().replace(/\D/gu, "").slice(0, 9)}`;
  const threadId = randomUUID();
  const cycleId = randomUUID();
  await seedCanonicalContext(db, {
    connectionId: input.connectionId,
    cycleId: randomUUID(),
    externalThreadId: `phone:${phone}`,
    phone: `+${phone}`,
    scope: input.scope,
    threadId: randomUUID(),
    threadState: "archived",
  });
  await seedCanonicalContext(db, {
    connectionId: input.connectionId,
    cycleId,
    externalThreadId: phone,
    phone,
    scope: input.scope,
    threadId,
  });
  const ingested = await repository.ingestInboundMessage({
    ...canonicalInbound({
      channel: "whatsapp",
      connectionId: input.connectionId,
      externalThreadId: `phone:${phone}`,
      identity: { kind: "phone", normalizedValue: phone },
      provider: "zapi",
      providerMessageId: `archived-husk-${randomUUID()}`,
      scope: input.scope,
    }),
    content: "Inbound after husk merge",
    externalThreadAliases: [phone],
  });
  expect(ingested).toMatchObject({ cycleId, threadId });
}
