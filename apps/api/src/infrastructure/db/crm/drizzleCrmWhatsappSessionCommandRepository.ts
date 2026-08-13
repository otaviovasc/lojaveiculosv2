import { and, eq } from "drizzle-orm";
import { crmWhatsappSessionCommandReceipts } from "@lojaveiculosv2/db";
import type {
  CrmWhatsappSessionCommandReceipt,
  CrmWhatsappSessionCommandRepository,
} from "../../../domains/crm/ports/crmWhatsappSessionCommandRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmWhatsappSessionCommandRepository(
  db: DrizzleCrmClient,
): CrmWhatsappSessionCommandRepository {
  return {
    async claim(input) {
      const [inserted] = await db
        .insert(crmWhatsappSessionCommandReceipts)
        .values(input)
        .onConflictDoNothing()
        .returning({ commandId: crmWhatsappSessionCommandReceipts.commandId });
      if (inserted) return { status: "claimed" };
      return { receipt: await requireReceipt(db, input), status: "existing" };
    },
    async complete(input) {
      const [receipt] = await db
        .update(crmWhatsappSessionCommandReceipts)
        .set({
          result: input.result,
          sessionRevision: input.sessionRevision,
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
    .from(crmWhatsappSessionCommandReceipts)
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
    eq(crmWhatsappSessionCommandReceipts.commandId, input.commandId),
    eq(crmWhatsappSessionCommandReceipts.storeId, input.storeId),
    eq(crmWhatsappSessionCommandReceipts.tenantId, input.tenantId),
  );
}

function toReceipt(
  row: typeof crmWhatsappSessionCommandReceipts.$inferSelect,
): CrmWhatsappSessionCommandReceipt {
  return {
    commandId: row.commandId,
    commandType:
      row.commandType as CrmWhatsappSessionCommandReceipt["commandType"],
    requestFingerprint: row.requestFingerprint,
    result: row.result,
    sessionId: row.sessionId,
    sessionRevision: row.sessionRevision,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  };
}
