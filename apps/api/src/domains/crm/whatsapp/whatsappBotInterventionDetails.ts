import type { CrmWhatsappSession } from "../ports/crmWhatsappRepository.js";
import {
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export type InterventionEventDetails = {
  durationSeconds: number | null;
  endedAt: Date | null;
  messageCount: number;
  reason: string | null;
  startedAt: Date | null;
  summary: string | null;
};

const interventionTranscriptLookbackMs = 5_000;
const maxInterventionSummaryMessages = 12;
const maxInterventionSummaryLineLength = 180;

export async function buildInterventionDetails(
  input: {
    active: boolean;
    endedAt?: Date | null;
    excludedMessageId?: string;
    reason?: string | null;
    session: CrmWhatsappSession;
    startedAt?: Date | null;
  },
  ports: CrmServicePorts,
): Promise<InterventionEventDetails> {
  const startedAt = input.startedAt ?? input.session.humanTakeoverAt;
  const endedAt = input.active ? null : (input.endedAt ?? new Date());
  const durationSeconds =
    startedAt && endedAt
      ? Math.max(
          0,
          Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
        )
      : null;
  if (input.active || !startedAt || !endedAt) {
    return {
      durationSeconds,
      endedAt,
      messageCount: 0,
      reason: input.reason ?? null,
      startedAt,
      summary: null,
    };
  }

  const transcript = await buildInterventionTranscript(
    input.session,
    startedAt,
    endedAt,
    input.excludedMessageId,
    ports,
  );
  return {
    durationSeconds,
    endedAt,
    messageCount: transcript.messageCount,
    reason: input.reason ?? null,
    startedAt,
    summary: transcript.summary,
  };
}

async function buildInterventionTranscript(
  session: CrmWhatsappSession,
  startedAt: Date,
  endedAt: Date,
  excludedMessageId: string | undefined,
  ports: CrmServicePorts,
) {
  const messages = await getCrmWhatsappRepository(ports).listMessages({
    limit: 100,
    offset: 0,
    sessionId: session.id,
    storeId: session.storeId,
    tenantId: session.tenantId,
  });
  const transcriptStartedAt = new Date(
    startedAt.getTime() - interventionTranscriptLookbackMs,
  );
  const transcript = messages
    .filter((message) => message.id !== excludedMessageId)
    .filter((message) => {
      const occurredAt = message.providerTimestamp ?? message.createdAt;
      if (occurredAt > endedAt) return false;
      if (occurredAt >= startedAt) return true;
      return (
        occurredAt >= transcriptStartedAt && message.direction === "OUTBOUND"
      );
    })
    .filter((message) => message.senderType !== "AI")
    .sort((left, right) => messageTime(left) - messageTime(right));

  if (transcript.length === 0) {
    return {
      messageCount: 0,
      summary:
        "Human intervention ended with no customer or staff messages during takeover.",
    };
  }

  const visible = transcript.slice(0, maxInterventionSummaryMessages);
  const lines = visible.map((message) => {
    const speaker = message.direction === "INBOUND" ? "Customer" : "Staff";
    return `${speaker}: ${truncateSummaryLine(message.content)}`;
  });
  if (transcript.length > visible.length) {
    lines.push(
      `... ${transcript.length - visible.length} more message(s) omitted.`,
    );
  }
  return { messageCount: transcript.length, summary: lines.join("\n") };
}

function messageTime(input: {
  createdAt: Date;
  providerTimestamp: Date | null;
}) {
  return (input.providerTimestamp ?? input.createdAt).getTime();
}

function truncateSummaryLine(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxInterventionSummaryLineLength) return normalized;
  return `${normalized.slice(0, maxInterventionSummaryLineLength - 1)}...`;
}
