import type {
  CrmWhatsappInterventionActorKind,
  CrmWhatsappRepository,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import {
  humanAttendanceReason,
  humanAttendanceSource,
  humanAttendanceUpdate,
  type HumanAttendanceCommand,
} from "./humanAttendanceStateUpdate.js";
import {
  interventionActorKind,
  persistHumanAttendanceTransition,
} from "./persistHumanAttendanceTransition.js";
import { WhatsappSessionRevisionConflictError } from "./whatsappSendErrors.js";

export { interventionActorKind };
export { humanAttendanceReason, humanAttendanceSource, humanAttendanceUpdate };
export type {
  HumanAttendanceClear,
  HumanAttendanceCommand,
  HumanAttendanceStart,
} from "./humanAttendanceStateUpdate.js";

export type HumanAttendanceTransitionResult = {
  changed: boolean;
  previous: CrmWhatsappSession;
  session: CrmWhatsappSession;
};

export async function transitionHumanAttendance(input: {
  actorId: string;
  actorKind: CrmWhatsappInterventionActorKind;
  command: HumanAttendanceCommand;
  expectedRevision?: number;
  now?: Date;
  repository: CrmWhatsappRepository;
  session: CrmWhatsappSession;
}): Promise<HumanAttendanceTransitionResult> {
  let current = input.session;
  const now = input.now ?? new Date();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (
      input.expectedRevision !== undefined &&
      current.revision !== input.expectedRevision
    ) {
      throw new WhatsappSessionRevisionConflictError(current.id);
    }
    const update = humanAttendanceUpdate(current, input.command, now);
    if (!update) return { changed: false, previous: current, session: current };
    const persisted = await persistHumanAttendanceTransition({
      actorId: input.actorId,
      actorKind: input.actorKind,
      current,
      now,
      reason:
        input.command.kind === "start"
          ? input.command.reason
          : (humanAttendanceReason(current) ?? "attendance_cleared"),
      repository: input.repository,
      source:
        input.command.kind === "start"
          ? input.command.source
          : (humanAttendanceSource(current) ?? "unknown"),
      update,
    });
    if (persisted) {
      return {
        changed: persisted.changed,
        previous: current,
        session: persisted.session,
      };
    }
    if (input.expectedRevision !== undefined) {
      throw new WhatsappSessionRevisionConflictError(current.id);
    }
    const [reloaded] = await input.repository.listSessions({
      limit: 1,
      offset: 0,
      sessionId: current.id,
      storeId: current.storeId,
      tenantId: current.tenantId,
    });
    if (!reloaded) throw new Error("CRM WhatsApp session disappeared.");
    current = reloaded;
  }
  throw new Error("CRM WhatsApp attendance transition conflicted repeatedly.");
}
