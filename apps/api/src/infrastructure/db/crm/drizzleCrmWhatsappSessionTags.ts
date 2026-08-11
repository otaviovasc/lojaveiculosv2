import { and, eq, sql } from "drizzle-orm";
import {
  crmTags,
  crmWhatsappSessions,
  crmWhatsappSessionTags,
} from "@lojaveiculosv2/db";
import type { UpdateCrmWhatsappSessionTagInput } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { findHydratedSessionById } from "./drizzleCrmWhatsappTagHydration.js";

export function mutateWhatsappSessionTagWithTransaction(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
  operation: "add" | "remove",
  disableTransactions: boolean,
) {
  const execute = (client: DrizzleCrmClient) =>
    operation === "add"
      ? addWhatsappSessionTag(client, input)
      : removeWhatsappSessionTag(client, input);
  return disableTransactions
    ? execute(db)
    : db.transaction(async (tx) => execute(tx as DrizzleCrmClient));
}

async function addWhatsappSessionTag(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const session = await findHydratedSessionById(db, input.sessionId, input);
  if (!session) return null;
  if (!(await hasScopedTag(db, input))) return session;
  const [inserted] = await db
    .insert(crmWhatsappSessionTags)
    .values({
      sessionId: input.sessionId,
      storeId: input.storeId,
      tagId: input.tagId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [crmWhatsappSessionTags.sessionId, crmWhatsappSessionTags.tagId],
    })
    .returning({ id: crmWhatsappSessionTags.id });
  if (inserted) await incrementSessionRevision(db, input);
  return inserted
    ? findHydratedSessionById(db, input.sessionId, input)
    : session;
}

async function removeWhatsappSessionTag(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const session = await findHydratedSessionById(db, input.sessionId, input);
  if (!session) return null;
  const [removed] = await db
    .delete(crmWhatsappSessionTags)
    .where(
      and(
        eq(crmWhatsappSessionTags.sessionId, input.sessionId),
        eq(crmWhatsappSessionTags.tagId, input.tagId),
        eq(crmWhatsappSessionTags.storeId, input.storeId),
        eq(crmWhatsappSessionTags.tenantId, input.tenantId),
      ),
    )
    .returning({ id: crmWhatsappSessionTags.id });
  if (removed) await incrementSessionRevision(db, input);
  return removed
    ? findHydratedSessionById(db, input.sessionId, input)
    : session;
}

async function incrementSessionRevision(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  await db
    .update(crmWhatsappSessions)
    .set({
      revision: sql`${crmWhatsappSessions.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmWhatsappSessions.id, input.sessionId),
        eq(crmWhatsappSessions.storeId, input.storeId),
        eq(crmWhatsappSessions.tenantId, input.tenantId),
      ),
    );
}

async function hasScopedTag(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const [row] = await db
    .select({ id: crmTags.id })
    .from(crmTags)
    .where(
      and(
        eq(crmTags.id, input.tagId),
        eq(crmTags.storeId, input.storeId as never),
        eq(crmTags.tenantId, input.tenantId as never),
      ),
    )
    .limit(1);
  return Boolean(row);
}
