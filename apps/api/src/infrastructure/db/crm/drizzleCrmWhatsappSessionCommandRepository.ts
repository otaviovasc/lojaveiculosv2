import { and, eq } from "drizzle-orm";
import { conversationCommandReceipts } from "@lojaveiculosv2/db";
import type {
  CrmWhatsappSessionCommandReceipt,
  CrmWhatsappSessionCommandRepository,
} from "../../../domains/crm/ports/crmWhatsappSessionCommandRepository.js";
import { findCanonicalThreadIdForCycle } from "./drizzleCrmCanonicalWorkflowReferences.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmWhatsappSessionCommandRepository(
  db: DrizzleCrmClient,
): CrmWhatsappSessionCommandRepository {
  return {
    async claim(input) {
      const threadId = await findCanonicalThreadIdForCycle(db, {
        cycleId: input.sessionId,
        storeId: input.storeId,
        tenantId: input.tenantId,
      });
      const [inserted] = await db
        .insert(conversationCommandReceipts)
        .values({
          commandId: input.commandId,
          commandType: input.commandType,
          cycleId: input.sessionId,
          requestFingerprint: input.requestFingerprint,
          storeId: input.storeId,
          tenantId: input.tenantId,
          threadId,
        })
        .onConflictDoNothing()
        .returning({ commandId: conversationCommandReceipts.commandId });
      if (inserted) return { status: "claimed" };
      return { receipt: await requireReceipt(db, input), status: "existing" };
    },
    async complete(input) {
      const [receipt] = await db
        .update(conversationCommandReceipts)
        .set({
          cycleRevision: input.sessionRevision,
          result: input.result,
          updatedAt: new Date(),
        })
        .where(receiptScope(input))
        .returning();
      if (!receipt) {
        throw new Error("CRM WhatsApp session command receipt disappeared.");
      }
      return toReceipt(receipt);
    },
  };
}

async function requireReceipt(
  db: DrizzleCrmClient,
  input: { commandId: string; storeId: string; tenantId: string },
) {
  const [receipt] = await db
    .select()
    .from(conversationCommandReceipts)
    .where(receiptScope(input))
    .limit(1);
  if (!receipt) {
    throw new Error("CRM WhatsApp session command receipt was not visible.");
  }
  return toReceipt(receipt);
}

function receiptScope(input: {
  commandId: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    eq(conversationCommandReceipts.commandId, input.commandId),
    eq(conversationCommandReceipts.storeId, input.storeId),
    eq(conversationCommandReceipts.tenantId, input.tenantId),
  );
}

function toReceipt(
  row: typeof conversationCommandReceipts.$inferSelect,
): CrmWhatsappSessionCommandReceipt {
  return {
    commandId: row.commandId,
    commandType:
      row.commandType as CrmWhatsappSessionCommandReceipt["commandType"],
    requestFingerprint: row.requestFingerprint,
    result: row.result,
    sessionId: row.cycleId,
    sessionRevision: row.cycleRevision,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  };
}
