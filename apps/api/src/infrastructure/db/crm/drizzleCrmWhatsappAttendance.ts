import { and, eq } from "drizzle-orm";
import {
  crmWhatsappInterventionLedger,
  crmWhatsappSessions,
} from "@lojaveiculosv2/db";
import type { TransitionCrmWhatsappAttendanceInput } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toWhatsappSession } from "./drizzleCrmWhatsappMappers.js";
import { countUnreadMessages } from "./drizzleCrmWhatsappQueries.js";
import { hydrateWhatsappSession } from "./drizzleCrmWhatsappTags.js";
import {
  cleanSessionUpdate,
  sessionUpdateFilters,
} from "./drizzleCrmWhatsappUpdates.js";

export function transitionWhatsappAttendanceWithTransaction(
  db: DrizzleCrmClient,
  input: TransitionCrmWhatsappAttendanceInput,
  disableTransactions: boolean,
) {
  const execute = (client: DrizzleCrmClient) =>
    transitionWhatsappAttendanceInDatabase(client, input);
  return disableTransactions
    ? execute(db)
    : db.transaction(async (tx) => execute(tx as DrizzleCrmClient));
}

async function transitionWhatsappAttendanceInDatabase(
  db: DrizzleCrmClient,
  input: TransitionCrmWhatsappAttendanceInput,
) {
  const existing = await findLedgerEntry(db, input);
  if (existing) {
    assertMatchingFingerprint(existing.requestFingerprint, input);
    return {
      session: await requireSession(db, input),
      transitionCreated: false,
    };
  }

  const [row] = await db
    .update(crmWhatsappSessions)
    .set(cleanSessionUpdate(input))
    .where(and(...sessionUpdateFilters(input)))
    .returning();
  if (!row) {
    const raced = await findLedgerEntry(db, input);
    if (raced) assertMatchingFingerprint(raced.requestFingerprint, input);
    return raced
      ? {
          session: await requireSession(db, input),
          transitionCreated: false,
        }
      : null;
  }

  await db.insert(crmWhatsappInterventionLedger).values({
    actorId: input.actorId,
    actorKind: input.actorKind,
    connectionId: row.connectionId,
    idempotencyKey: input.idempotencyKey,
    interventionId: input.interventionIdForLedger,
    nextState: input.nextState,
    occurredAt: input.occurredAt,
    previousState: input.previousState,
    reason: input.reason,
    requestFingerprint: input.requestFingerprint,
    sessionId: row.id,
    sessionRevision: row.revision,
    source: input.source,
    storeId: row.storeId,
    tenantId: row.tenantId,
  });

  return {
    session: await hydrateWhatsappSession(
      db,
      toWhatsappSession(row, await countUnreadMessages(db, row)),
    ),
    transitionCreated: true,
  };
}

function assertMatchingFingerprint(
  persistedFingerprint: string,
  input: TransitionCrmWhatsappAttendanceInput,
) {
  if (persistedFingerprint === input.requestFingerprint) return;
  throw new Error(
    "CRM WhatsApp attendance idempotency key was reused with a different request.",
  );
}

function findLedgerEntry(
  db: DrizzleCrmClient,
  input: TransitionCrmWhatsappAttendanceInput,
) {
  return db.query.crmWhatsappInterventionLedger.findFirst({
    where: and(
      eq(crmWhatsappInterventionLedger.tenantId, input.tenantId),
      eq(crmWhatsappInterventionLedger.storeId, input.storeId),
      eq(crmWhatsappInterventionLedger.sessionId, input.sessionId),
      eq(crmWhatsappInterventionLedger.idempotencyKey, input.idempotencyKey),
    ),
  });
}

async function requireSession(
  db: DrizzleCrmClient,
  input: TransitionCrmWhatsappAttendanceInput,
) {
  const [row] = await db
    .select()
    .from(crmWhatsappSessions)
    .where(
      and(
        eq(crmWhatsappSessions.id, input.sessionId),
        eq(crmWhatsappSessions.storeId, input.storeId),
        eq(crmWhatsappSessions.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("CRM WhatsApp session disappeared.");
  return hydrateWhatsappSession(
    db,
    toWhatsappSession(row, await countUnreadMessages(db, row)),
  );
}
