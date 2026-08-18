import type { TransitionCrmWhatsappAttendanceInput } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  assertMatchingAttendanceEvent,
  findAttendanceTransitionEvent,
} from "./drizzleCrmWhatsappAttendanceEvents.js";
import { findHydratedSessionById } from "./drizzleCrmWhatsappTagHydration.js";
import { updateWhatsappSession } from "./drizzleCrmWhatsappUpdates.js";

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
  const existing = await findAttendanceTransitionEvent(db, input);
  if (existing) {
    assertMatchingAttendanceEvent(existing, input);
    return {
      session: await requireSession(db, input),
      transitionCreated: false,
    };
  }

  const session = await updateWhatsappSession(db, input);
  if (session) return { session, transitionCreated: true };

  const raced = await findAttendanceTransitionEvent(db, input);
  if (!raced) return null;
  assertMatchingAttendanceEvent(raced, input);
  return {
    session: await requireSession(db, input),
    transitionCreated: false,
  };
}

async function requireSession(
  db: DrizzleCrmClient,
  input: TransitionCrmWhatsappAttendanceInput,
) {
  const session = await findHydratedSessionById(db, input.sessionId, input);
  if (!session)
    throw new Error("Canonical CRM conversation cycle disappeared.");
  return session;
}
