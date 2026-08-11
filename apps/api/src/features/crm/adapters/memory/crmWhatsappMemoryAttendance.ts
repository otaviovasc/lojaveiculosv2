import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
  TransitionCrmWhatsappAttendanceInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";
import { updateMemoryWhatsappSession } from "./crmWhatsappMemoryMutations.js";
import { withUnreadCount } from "./crmWhatsappMemoryQueries.js";
import {
  requireHydratedSession,
  type MemoryWhatsappTagState,
} from "./crmWhatsappMemoryTags.js";

type MemoryAttendanceState = {
  attendanceLedgerFingerprints: Map<string, string>;
  messages: CrmWhatsappMessage[];
  sessions: CrmWhatsappSession[];
  tagState: MemoryWhatsappTagState;
};

export function transitionMemoryWhatsappAttendance(
  state: MemoryAttendanceState,
  input: TransitionCrmWhatsappAttendanceInput,
) {
  const ledgerKey = [
    input.tenantId,
    input.storeId,
    input.sessionId,
    input.idempotencyKey,
  ].join(":");
  const existingFingerprint = state.attendanceLedgerFingerprints.get(ledgerKey);
  if (existingFingerprint && existingFingerprint !== input.requestFingerprint) {
    throw new Error(
      "CRM WhatsApp attendance idempotency key was reused with a different request.",
    );
  }
  if (existingFingerprint) {
    const current = state.sessions.find(
      (session) =>
        session.id === input.sessionId &&
        session.storeId === input.storeId &&
        session.tenantId === input.tenantId,
    );
    return current
      ? {
          session: requireHydratedSession(
            withUnreadCount(current, state.messages),
            state.tagState,
          ),
          transitionCreated: false,
        }
      : null;
  }
  const updated = updateMemoryWhatsappSession(
    state.sessions,
    state.messages,
    input,
  );
  if (!updated) return null;
  state.attendanceLedgerFingerprints.set(ledgerKey, input.requestFingerprint);
  return {
    session: requireHydratedSession(updated, state.tagState),
    transitionCreated: true,
  };
}
