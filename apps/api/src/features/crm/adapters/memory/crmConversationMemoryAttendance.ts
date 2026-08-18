import type {
  CrmMessage,
  CrmConversationCycle,
  TransitionCrmAttendanceInput,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import { updateMemoryCrmConversationCycle } from "./crmConversationMemoryMutations.js";
import { withUnreadCount } from "./crmConversationMemoryQueries.js";
import {
  requireHydratedCycle,
  type MemoryCrmTagState,
} from "./crmTagMemory.js";

type MemoryAttendanceState = {
  attendanceLedgerFingerprints: Map<string, string>;
  messages: CrmMessage[];
  cycles: CrmConversationCycle[];
  tagState: MemoryCrmTagState;
};

export function transitionMemoryWhatsappAttendance(
  state: MemoryAttendanceState,
  input: TransitionCrmAttendanceInput,
) {
  const ledgerKey = [
    input.tenantId,
    input.storeId,
    input.cycleId,
    input.idempotencyKey,
  ].join(":");
  const existingFingerprint = state.attendanceLedgerFingerprints.get(ledgerKey);
  if (existingFingerprint && existingFingerprint !== input.requestFingerprint) {
    throw new Error(
      "CRM WhatsApp attendance idempotency key was reused with a different request.",
    );
  }
  if (existingFingerprint) {
    const current = state.cycles.find(
      (cycle) =>
        cycle.id === input.cycleId &&
        cycle.storeId === input.storeId &&
        cycle.tenantId === input.tenantId,
    );
    return current
      ? {
          conversationCycle: requireHydratedCycle(
            withUnreadCount(current, state.messages),
            state.tagState,
          ),
          transitionCreated: false,
        }
      : null;
  }
  const updated = updateMemoryCrmConversationCycle(
    state.cycles,
    state.messages,
    input,
  );
  if (!updated) return null;
  state.attendanceLedgerFingerprints.set(ledgerKey, input.requestFingerprint);
  return {
    conversationCycle: requireHydratedCycle(updated, state.tagState),
    transitionCreated: true,
  };
}
