import type { TransitionCrmAttendanceInput } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  assertMatchingAttendanceEvent,
  findAttendanceTransitionEvent,
} from "./drizzleCrmAttendanceEvents.js";
import { findHydratedSessionById } from "./drizzleCrmTagHydration.js";
import { updateConversationCycle } from "./drizzleCrmConversationUpdates.js";

export function transitionWhatsappAttendanceWithTransaction(
  db: DrizzleCrmClient,
  input: TransitionCrmAttendanceInput,
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
  input: TransitionCrmAttendanceInput,
) {
  const existing = await findAttendanceTransitionEvent(db, input);
  if (existing) {
    assertMatchingAttendanceEvent(existing, input);
    return {
      conversationCycle: await requireSession(db, input),
      transitionCreated: false,
    };
  }

  const conversationCycle = await updateConversationCycle(db, input);
  if (conversationCycle) return { conversationCycle, transitionCreated: true };

  const raced = await findAttendanceTransitionEvent(db, input);
  if (!raced) return null;
  assertMatchingAttendanceEvent(raced, input);
  return {
    conversationCycle: await requireSession(db, input),
    transitionCreated: false,
  };
}

async function requireSession(
  db: DrizzleCrmClient,
  input: TransitionCrmAttendanceInput,
) {
  const conversationCycle = await findHydratedSessionById(
    db,
    input.cycleId,
    input,
  );
  if (!conversationCycle)
    throw new Error("Canonical CRM conversation cycle disappeared.");
  return conversationCycle;
}
