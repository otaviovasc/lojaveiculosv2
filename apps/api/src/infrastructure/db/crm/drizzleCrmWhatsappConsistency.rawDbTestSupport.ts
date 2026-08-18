import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect } from "vitest";
import type {
  CrmWhatsappRepository,
  IngestCrmWhatsappMessageInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import type {
  RawWhatsappFixture,
  RawWhatsappScope,
} from "./drizzleCrmWhatsappConsistency.rawDbTestTypes.js";

export async function withRawCrmTransaction(
  callback: (transaction: DrizzleCrmClient) => Promise<void>,
) {
  expect(
    process.env.DATABASE_URL,
    "DATABASE_URL is required for raw CRM database validation",
  ).toBeTruthy();
  const sqlClient = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
  const db = drizzle(sqlClient, { schema });
  const rollback = Symbol("rollback CRM consistency validation");
  try {
    await db.transaction(async (transaction) => {
      await callback(transaction as DrizzleCrmClient);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await sqlClient.end();
  }
}

export async function seedRawWhatsappFixture(
  transaction: DrizzleCrmClient,
): Promise<RawWhatsappFixture> {
  const [baseStore] = await transaction
    .select({ storeId: schema.stores.id, tenantId: schema.stores.tenantId })
    .from(schema.stores)
    .limit(1);
  expect(baseStore, "Seed one store before raw CRM validation").toBeTruthy();
  if (!baseStore) throw new Error("Store scope is missing.");

  const siblingStoreId = randomUUID() as StoreId;
  const foreignTenantId = randomUUID() as TenantId;
  const foreignStoreId = randomUUID() as StoreId;
  await transaction.insert(schema.tenants).values({
    id: foreignTenantId,
    legalName: `Raw CRM tenant ${foreignTenantId}`,
    slug: `raw-crm-${foreignTenantId}`,
    tradingName: "Raw CRM foreign tenant",
  });
  await transaction.insert(schema.stores).values([
    {
      id: siblingStoreId,
      publicSlug: `raw-crm-sibling-${siblingStoreId}`,
      tenantId: baseStore.tenantId,
      tradingName: "Raw CRM sibling store",
    },
    {
      id: foreignStoreId,
      publicSlug: `raw-crm-foreign-${foreignStoreId}`,
      tenantId: foreignTenantId,
      tradingName: "Raw CRM foreign store",
    },
  ]);

  const assigneeId = randomUUID() as UserId;
  const otherAssigneeId = randomUUID() as UserId;
  await transaction.insert(schema.users).values([
    {
      id: assigneeId,
      email: `${assigneeId}@raw-crm.invalid`,
      name: "Raw CRM assignee",
      tenantId: baseStore.tenantId,
    },
    {
      id: otherAssigneeId,
      email: `${otherAssigneeId}@raw-crm.invalid`,
      name: "Raw CRM other assignee",
      tenantId: baseStore.tenantId,
    },
  ]);

  const primary = scope(baseStore.storeId, baseStore.tenantId);
  const sibling = scope(siblingStoreId, baseStore.tenantId);
  const foreign = scope(foreignStoreId, foreignTenantId);
  const [roleTemplate] = await transaction
    .select({ id: schema.roleTemplates.id })
    .from(schema.roleTemplates)
    .limit(1);
  expect(
    roleTemplate,
    "Seed one role template before raw CRM validation",
  ).toBeTruthy();
  if (!roleTemplate) throw new Error("Role template is missing.");
  await transaction.insert(schema.storeMemberships).values([
    {
      roleTemplateId: roleTemplate.id,
      storeId: primary.storeId,
      tenantId: primary.tenantId,
      userId: assigneeId,
    },
    {
      roleTemplateId: roleTemplate.id,
      storeId: primary.storeId,
      tenantId: primary.tenantId,
      userId: otherAssigneeId,
    },
  ]);
  for (const current of [primary, sibling, foreign]) {
    await transaction.insert(schema.providerConnections).values({
      broker: "direct",
      channel: "whatsapp",
      displayName: `Raw CRM ${current.storeId}`,
      id: current.connectionId,
      metadata: { syntheticValidation: true },
      provider: "zapi",
      state: "active",
      storeId: current.storeId,
      tenantId: current.tenantId,
    });
  }
  return { assigneeId, foreign, otherAssigneeId, primary, sibling };
}

export function rawWhatsappMessage(
  current: RawWhatsappScope,
  overrides: Partial<IngestCrmWhatsappMessageInput> = {},
): IngestCrmWhatsappMessageInput {
  const input: IngestCrmWhatsappMessageInput = {
    buyerName: "Raw CRM buyer",
    buyerPhone: `5511${randomUUID().replaceAll("-", "").slice(0, 10)}`,
    channel: "WHATSAPP",
    content: "Raw CRM validation message",
    direction: "INBOUND",
    externalId: `raw-message-${randomUUID()}`,
    metadata: { syntheticValidation: true },
    providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    type: "TEXT",
    ...overrides,
    connectionId: current.connectionId,
    storeId: current.storeId,
    tenantId: current.tenantId,
  };
  return input;
}

export async function seedRawWhatsappMessage(
  repository: CrmWhatsappRepository,
  current: RawWhatsappScope,
  overrides: Partial<IngestCrmWhatsappMessageInput> = {},
) {
  return repository.ingestMessage(rawWhatsappMessage(current, overrides));
}

export async function assertRawWhatsappDuplicateAndCas(
  repository: CrmWhatsappRepository,
  current: RawWhatsappScope,
) {
  const buyerPhone = `55000${Date.now().toString().slice(-8)}`;
  const echo = rawWhatsappMessage(current, {
    buyerPhone,
    content: "synthetic outbound validation",
    direction: "OUTBOUND",
    senderOrigin: "unknown",
    senderType: "SYSTEM",
    status: "SENT",
  });
  const first = await repository.ingestMessage(echo);
  const correlated = await repository.ingestMessage({
    ...echo,
    senderOrigin: "human_crm",
    senderType: "HUMAN",
  });
  const replay = await repository.ingestMessage(echo);
  expect(first).toMatchObject({
    createdMessage: true,
    message: { senderOrigin: "unknown", senderType: "SYSTEM" },
  });
  expect(correlated).toMatchObject({
    createdMessage: false,
    message: { senderOrigin: "human_crm", senderType: "HUMAN" },
  });
  expect(replay.message).toMatchObject({
    senderOrigin: "human_crm",
    senderType: "HUMAN",
  });
  const inbound = await seedRawWhatsappMessage(repository, current, {
    buyerPhone,
    externalId: `raw-inbound-${randomUUID()}`,
  });
  const completed = await repository.updateSession({
    expectedRevision: inbound.session.revision,
    sessionId: inbound.session.id,
    status: "COMPLETED",
    storeId: current.storeId,
    tenantId: current.tenantId,
  });
  expect(completed).not.toBeNull();
  if (!completed) throw new Error("Synthetic session was not completed.");
  const duplicate = await repository.ingestMessage(
    rawWhatsappMessage(current, {
      buyerPhone,
      externalId: inbound.message.externalId ?? "",
    }),
  );
  expect(duplicate).toMatchObject({
    createdMessage: false,
    session: {
      messageCount: completed.messageCount,
      revision: completed.revision,
      status: "COMPLETED",
    },
  });
  expect(
    await repository.updateSession({
      expectedRevision: completed.revision - 1,
      sessionId: completed.id,
      status: "ACTIVE",
      storeId: current.storeId,
      tenantId: current.tenantId,
    }),
  ).toBeNull();
}

function scope(storeId: string, tenantId: string): RawWhatsappScope {
  return {
    connectionId: randomUUID(),
    storeId: storeId as StoreId,
    tenantId: tenantId as TenantId,
  };
}
