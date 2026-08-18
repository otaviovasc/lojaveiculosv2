import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { eq } from "drizzle-orm";
import { expect } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { projectZapiCanonicalInbound } from "../../../domains/crm/whatsapp/persistZapiCanonicalProjection.js";
import { createDrizzleCrmWhatsappRepository } from "./drizzleCrmWhatsappRepository.js";
import type { CrmCanonicalInboundRepository } from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { canonicalInbound } from "./drizzleCrmCanonicalInbound.rawDbTestSupport.js";
import { seedCanonicalContext } from "./drizzleCrmCanonicalInboundRegressionSeeds.rawDbTestSupport.js";

type Scope = { storeId: string; tenantId: string };

export async function validateCanonicalInboundRegressions(
  db: DrizzleCrmClient,
  repository: CrmCanonicalInboundRepository,
  input: { connectionId: string; scope: Scope },
) {
  const phone = `5511${randomUUID().replace(/\D/gu, "").slice(0, 9)}`;
  const chatLid = `${phone}123@lid`;
  const threadId = randomUUID();
  const cycleId = randomUUID();
  await seedCanonicalContext(db, {
    chatLid,
    connectionId: input.connectionId,
    cycleId,
    externalThreadId: phone,
    phone: `+${phone}`,
    scope: input.scope,
    threadId,
  });

  const newer = await repository.ingestInboundMessage({
    ...canonicalInbound({
      channel: "whatsapp",
      connectionId: input.connectionId,
      externalThreadId: `phone:${phone}`,
      identity: { kind: "phone", normalizedValue: `+${phone}` },
      provider: "zapi",
      providerMessageId: `newer-${randomUUID()}`,
      scope: input.scope,
    }),
    content: "Newest preview",
    customerChatId: chatLid,
    externalThreadAliases: [phone, chatLid, `lid:${chatLid}`],
    leadId: randomUUID(),
    occurredAt: new Date("2026-08-12T15:00:00.000Z"),
  });
  const olderInput = {
    ...canonicalInbound({
      channel: "whatsapp" as const,
      connectionId: input.connectionId,
      externalThreadId: `phone:+${phone}`,
      identity: { kind: "phone" as const, normalizedValue: `+${phone}` },
      provider: "zapi" as const,
      providerMessageId: `older-${randomUUID()}`,
      scope: input.scope,
    }),
    content: "Older delayed preview",
    customerChatId: chatLid,
    externalThreadAliases: [phone, `phone:${phone}`, chatLid],
    occurredAt: new Date("2026-08-12T14:00:00.000Z"),
  };
  const older = await repository.ingestInboundMessage(olderInput);
  expect(newer).toMatchObject({
    createdSession: false,
    cycleId,
    threadId,
  });
  expect(older).toMatchObject({ createdSession: false, cycleId, threadId });

  const [preview] = await db
    .select({
      cycleContent: schema.conversationCycles.lastMessageContent,
      cycleCount: schema.conversationCycles.messageCount,
      cycleLastMessageAt: schema.conversationCycles.lastMessageAt,
      threadLastMessageAt: schema.conversationThreads.lastMessageAt,
    })
    .from(schema.conversationCycles)
    .innerJoin(
      schema.conversationThreads,
      eq(schema.conversationCycles.threadId, schema.conversationThreads.id),
    )
    .where(eq(schema.conversationCycles.id, cycleId));
  expect(preview).toMatchObject({
    cycleContent: "Newest preview",
    cycleCount: 2,
    cycleLastMessageAt: new Date("2026-08-12T15:00:00.000Z"),
    threadLastMessageAt: new Date("2026-08-12T15:00:00.000Z"),
  });

  await validateHydratedProjection(db, older, olderInput.providerMessageId, {
    connectionId: input.connectionId,
    cycleId,
    scope: input.scope,
    threadId,
  });
  await expectAmbiguousIdentityClosed(db, repository, input);
}

async function validateHydratedProjection(
  db: DrizzleCrmClient,
  canonical: Awaited<
    ReturnType<CrmCanonicalInboundRepository["ingestInboundMessage"]>
  >,
  externalId: string,
  input: {
    connectionId: string;
    cycleId: string;
    scope: Scope;
    threadId: string;
  },
) {
  const userId = randomUUID();
  const tagId = randomUUID();
  await db.insert(schema.users).values({
    email: `canonical-${userId}@example.test`,
    id: userId,
    tenantId: input.scope.tenantId,
  });
  const [roleTemplate] = await db
    .select({ id: schema.roleTemplates.id })
    .from(schema.roleTemplates)
    .limit(1);
  expect(
    roleTemplate,
    "Seed one role template before raw CRM validation",
  ).toBeTruthy();
  if (!roleTemplate) throw new Error("Role template is missing.");
  await db.insert(schema.storeMemberships).values({
    roleTemplateId: roleTemplate.id,
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
    userId,
  });
  await db
    .update(schema.conversationCycles)
    .set({ assignedUserId: userId, revision: 11 })
    .where(eq(schema.conversationCycles.id, input.cycleId));
  await db
    .update(schema.conversationAttendances)
    .set({
      assignedAt: new Date("2026-08-12T13:00:00.000Z"),
      assignedUserId: userId,
    })
    .where(eq(schema.conversationAttendances.cycleId, input.cycleId));
  await db.insert(schema.crmTags).values({
    connectionId: input.connectionId,
    id: tagId,
    name: "VIP",
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
  });
  await db.insert(schema.conversationThreadTags).values({
    storeId: input.scope.storeId,
    tagId,
    tenantId: input.scope.tenantId,
    threadId: input.threadId,
  });
  const connection = {
    credentialsRef: {},
    displayName: "Raw Z-API",
    externalConnectionId: null,
    externalInstanceId: null,
    id: input.connectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
    webhookUrl: null,
  } as CrmConnection;
  const projection = await projectZapiCanonicalInbound(
    {
      crmWhatsappRepository: createDrizzleCrmWhatsappRepository(db, {
        disableTransactions: true,
      }),
    } as CrmServicePorts,
    { canonical, connection, message: { externalId } },
  );
  expect(projection).toMatchObject({
    createdMessage: true,
    createdSession: false,
    message: { id: canonical.messageId },
    session: {
      assignedUserId: userId,
      messageCount: 2,
      revision: 11,
      sessionTags: [{ id: tagId, name: "VIP" }],
      unreadCount: 2,
    },
  });
}

async function expectAmbiguousIdentityClosed(
  db: DrizzleCrmClient,
  repository: CrmCanonicalInboundRepository,
  input: { connectionId: string; scope: Scope },
) {
  const phone = `5511${randomUUID().replace(/\D/gu, "").slice(0, 9)}`;
  const chatLid = `${randomUUID().replace(/-/gu, "").slice(0, 15)}@lid`;
  await seedCanonicalContext(db, {
    connectionId: input.connectionId,
    cycleId: randomUUID(),
    externalThreadId: phone,
    phone,
    scope: input.scope,
    threadId: randomUUID(),
  });
  await seedCanonicalContext(db, {
    chatLid,
    connectionId: input.connectionId,
    cycleId: randomUUID(),
    externalThreadId: `lid:${chatLid}`,
    scope: input.scope,
    threadId: randomUUID(),
  });
  await expect(
    repository.ingestInboundMessage({
      ...canonicalInbound({
        channel: "whatsapp",
        connectionId: input.connectionId,
        externalThreadId: `phone:${phone}`,
        identity: { kind: "phone", normalizedValue: phone },
        provider: "zapi",
        providerMessageId: `ambiguous-${randomUUID()}`,
        scope: input.scope,
      }),
      customerChatId: chatLid,
      externalThreadAliases: [phone, chatLid],
    }),
  ).rejects.toThrow("thread identity is ambiguous");
}
