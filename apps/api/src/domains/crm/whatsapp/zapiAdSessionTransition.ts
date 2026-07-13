import type {
  CrmWhatsappRepository,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import type { ZapiAdAttribution } from "./zapiAdAttribution.js";

export type ZapiAdSessionTransition = {
  endedAt: Date | null;
  interventionStartedAt: Date | null;
  resumedIntervention: boolean;
  session: CrmWhatsappSession;
};

export async function applyZapiAdSessionTransition(
  repository: CrmWhatsappRepository,
  input: {
    actorId: string;
    attribution: ZapiAdAttribution;
    detectedAt: Date;
    session: CrmWhatsappSession;
  },
): Promise<ZapiAdSessionTransition> {
  const resumedIntervention = input.session.status === "HUMAN_TAKEOVER";
  const shouldStoreAttribution = input.session.metadata.isAdInitiated !== true;
  if (!resumedIntervention && !shouldStoreAttribution) {
    return unchanged(input.session);
  }

  const interventionStartedAt = resumedIntervention
    ? input.session.humanTakeoverAt
    : null;
  const metadata = {
    ...input.session.metadata,
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
  const updated = await repository.updateSession({
    ...(resumedIntervention ? { humanTakeoverAt: null, status: "ACTIVE" } : {}),
    metadata,
    sessionId: input.session.id,
    storeId: input.session.storeId,
    tenantId: input.session.tenantId,
  });
  if (!updated) throw new Error("CRM WhatsApp ad session was not found.");
  return {
    endedAt: resumedIntervention ? input.detectedAt : null,
    interventionStartedAt,
    resumedIntervention,
    session: updated,
  };
}

export function unchangedZapiAdSession(
  session: CrmWhatsappSession,
): ZapiAdSessionTransition {
  return unchanged(session);
}

function unchanged(session: CrmWhatsappSession): ZapiAdSessionTransition {
  return {
    endedAt: null,
    interventionStartedAt: null,
    resumedIntervention: false,
    session,
  };
}
