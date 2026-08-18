import type {
  CrmInterventionActorKind,
  CrmConversationRepository,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
import type { ZapiAdAttribution } from "./zapiAdAttribution.js";
import { transitionHumanAttendance } from "../messaging/humanAttendanceTransition.js";

export type ZapiAdSessionTransition = {
  endedAt: Date | null;
  interventionStartedAt: Date | null;
  previousSession: CrmConversationCycle;
  resumedIntervention: boolean;
  conversationCycle: CrmConversationCycle;
};

export async function applyZapiAdSessionTransition(
  repository: CrmConversationRepository,
  input: {
    actorId: string;
    actorKind: CrmInterventionActorKind;
    attribution: ZapiAdAttribution;
    detectedAt: Date;
    conversationCycle: CrmConversationCycle;
  },
): Promise<ZapiAdSessionTransition> {
  const resumedIntervention =
    input.conversationCycle.status === "HUMAN_TAKEOVER";
  const shouldStoreAttribution =
    input.conversationCycle.metadata.isAdInitiated !== true;
  if (!resumedIntervention && !shouldStoreAttribution) {
    return unchanged(input.conversationCycle);
  }

  const interventionStartedAt = resumedIntervention
    ? input.conversationCycle.humanTakeoverAt
    : null;
  const attendanceTransition = resumedIntervention
    ? await transitionHumanAttendance({
        actorId: input.actorId,
        actorKind: input.actorKind,
        command: { kind: "clear", status: "ACTIVE" },
        now: input.detectedAt,
        repository,
        conversationCycle: input.conversationCycle,
      })
    : null;
  const currentSession =
    attendanceTransition?.conversationCycle ?? input.conversationCycle;
  const metadata = {
    ...currentSession.metadata,
    ...(shouldStoreAttribution ? input.attribution : {}),
    ...(resumedIntervention
      ? {
          lastInterventionToggle: {
            actorId: input.actorId,
            enabled: false,
            endedAt: input.detectedAt.toISOString(),
            reason: "ad_initiated_conversation",
            startedAt: interventionStartedAt?.toISOString() ?? null,
            toggledAt: input.detectedAt.toISOString(),
          },
        }
      : {}),
  };
  const updated = await repository.updateConversationCycle({
    expectedRevision: currentSession.revision,
    metadata,
    cycleId: input.conversationCycle.id,
    storeId: input.conversationCycle.storeId,
    tenantId: input.conversationCycle.tenantId,
  });
  if (!updated)
    throw new Error("CRM WhatsApp ad conversationCycle was not found.");
  return {
    endedAt: resumedIntervention ? input.detectedAt : null,
    interventionStartedAt,
    previousSession: attendanceTransition?.previous ?? input.conversationCycle,
    resumedIntervention,
    conversationCycle: updated,
  };
}

export function unchangedZapiAdSession(
  conversationCycle: CrmConversationCycle,
): ZapiAdSessionTransition {
  return unchanged(conversationCycle);
}

function unchanged(
  conversationCycle: CrmConversationCycle,
): ZapiAdSessionTransition {
  return {
    endedAt: null,
    interventionStartedAt: null,
    previousSession: conversationCycle,
    resumedIntervention: false,
    conversationCycle,
  };
}
