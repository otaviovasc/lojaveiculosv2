import { and, eq } from "drizzle-orm";
import { crmWhatsappMessages } from "@lojaveiculosv2/db";
import type {
  FindCrmWhatsappMessageByExternalIdInput,
  FindCrmWhatsappMessageByIdInput,
  UpdateCrmWhatsappMessageInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toWhatsappMessage } from "./drizzleCrmWhatsappMappers.js";

export async function findWhatsappMessageBySessionExternalId(
  db: DrizzleCrmClient,
  sessionId: string,
  externalId: string,
) {
  const [row] = await db
    .select()
    .from(crmWhatsappMessages)
    .where(
      and(
        eq(crmWhatsappMessages.sessionId, sessionId),
        eq(crmWhatsappMessages.externalId, externalId),
      ),
    )
    .limit(1);
  return row;
}

export async function findWhatsappMessageByExternalId(
  db: DrizzleCrmClient,
  input: FindCrmWhatsappMessageByExternalIdInput,
) {
  const [row] = await db
    .select()
    .from(crmWhatsappMessages)
    .where(
      and(
        eq(crmWhatsappMessages.connectionId, input.connectionId),
        eq(crmWhatsappMessages.externalId, input.externalId),
        eq(crmWhatsappMessages.storeId, input.storeId),
        eq(crmWhatsappMessages.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row ? toWhatsappMessage(row) : null;
}

export async function findWhatsappMessageById(
  db: DrizzleCrmClient,
  input: FindCrmWhatsappMessageByIdInput,
) {
  const [row] = await db
    .select()
    .from(crmWhatsappMessages)
    .where(
      and(
        eq(crmWhatsappMessages.id, input.messageId),
        eq(crmWhatsappMessages.storeId, input.storeId),
        eq(crmWhatsappMessages.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row ? toWhatsappMessage(row) : null;
}

export async function updateWhatsappMessage(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappMessageInput,
) {
  const [row] = await db
    .update(crmWhatsappMessages)
    .set({
      ...(input.deletedAt !== undefined ? { deletedAt: input.deletedAt } : {}),
      ...(input.externalId !== undefined
        ? { externalId: input.externalId }
        : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      ...(input.providerTimestamp !== undefined
        ? { providerTimestamp: input.providerTimestamp }
        : {}),
      ...(input.status ? { status: input.status } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmWhatsappMessages.id, input.messageId),
        eq(crmWhatsappMessages.storeId, input.storeId),
        eq(crmWhatsappMessages.tenantId, input.tenantId),
      ),
    )
    .returning();
  return row ? toWhatsappMessage(row) : null;
}
