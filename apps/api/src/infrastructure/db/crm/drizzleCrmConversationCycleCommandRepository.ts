import { and, eq } from "drizzle-orm";
import { conversationCommandReceipts } from "@lojaveiculosv2/db";
import type {
  CrmConversationCycleCommandReceipt,
  CrmConversationCycleCommandRepository,
} from "../../../domains/crm/ports/crmConversationCycleCommandRepository.js";
import { findCanonicalThreadIdForCycle } from "./drizzleCrmCanonicalWorkflowReferences.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmConversationCycleCommandRepository(
  db: DrizzleCrmClient,
): CrmConversationCycleCommandRepository {
  return {
    async claim(input) {
      const threadId = await findCanonicalThreadIdForCycle(db, {
        cycleId: input.cycleId,
        storeId: input.storeId,
        tenantId: input.tenantId,
      });
      const [inserted] = await db
        .insert(conversationCommandReceipts)
        .values({
          commandId: input.commandId,
          commandType: input.commandType,
          cycleId: input.cycleId,
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
          cycleRevision: input.cycleRevision,
          result: input.result,
          updatedAt: new Date(),
        })
        .where(receiptScope(input))
        .returning();
      if (!receipt) {
        throw new Error(
          "CRM WhatsApp conversationCycle command receipt disappeared.",
        );
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
    throw new Error(
      "CRM WhatsApp conversationCycle command receipt was not visible.",
    );
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
): CrmConversationCycleCommandReceipt {
  return {
    commandId: row.commandId,
    commandType:
      row.commandType as CrmConversationCycleCommandReceipt["commandType"],
    requestFingerprint: row.requestFingerprint,
    result: row.result,
    cycleId: row.cycleId,
    cycleRevision: row.cycleRevision,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  };
}
