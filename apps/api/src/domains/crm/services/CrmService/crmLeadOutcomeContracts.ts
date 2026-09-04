import type {
  CrmLeadOutcome,
  CrmLeadOutcomeLossReason,
} from "../../ports/crmOutcomeRepository.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";

export type ConcludeWhatsappAttendanceInput =
  | {
      commandId: string;
      outcome: "follow_up";
      reminder?: { dueAt: string };
      cycleId: string;
    }
  | {
      commandId: string;
      note?: string;
      outcome: "lost";
      reason: CrmLeadOutcomeLossReason;
      cycleId: string;
    };

export type ConcludeWhatsappAttendanceResult = {
  result: "applied" | "already_applied" | "superseded";
  conversationCycle: CrmConversationCycle;
};

export type ApplyWonCrmLeadOutcomeInput = {
  commandId: string;
  leadId: string;
  originSessionId?: string | null;
  saleId: string;
};

export type ApplyWonCrmLeadOutcomeResult = {
  outcome: CrmLeadOutcome;
  result: "applied" | "already_applied";
};

export class CrmLeadOutcomeValidationError extends Error {}
export class CrmLeadOutcomeCommandConflictError extends Error {}
