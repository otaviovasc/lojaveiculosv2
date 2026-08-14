import type {
  CrmLeadOutcome,
  CrmLeadOutcomeLossReason,
} from "../../ports/crmOutcomeRepository.js";
import type { WhatsappSession } from "../../whatsapp/whatsappModels.js";

export type ConcludeWhatsappAttendanceInput =
  | {
      commandId: string;
      outcome: "follow_up";
      reminder?: { dueAt: string };
      sessionId: string;
    }
  | {
      commandId: string;
      note?: string;
      outcome: "lost";
      reason: CrmLeadOutcomeLossReason;
      sessionId: string;
    };

export type ConcludeWhatsappAttendanceResult = {
  result: "applied" | "already_applied" | "superseded";
  session: WhatsappSession;
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
