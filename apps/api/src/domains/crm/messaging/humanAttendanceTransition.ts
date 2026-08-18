import type {
  CrmInterventionActorKind,
  CrmConversationRepository,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
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
import { ConversationCycleRevisionConflictError } from "./crmMessagingErrors.js";

export { interventionActorKind };
export { humanAttendanceReason, humanAttendanceSource, humanAttendanceUpdate };
export type {
  HumanAttendanceClear,
  HumanAttendanceCommand,
  HumanAttendanceStart,
} from "./humanAttendanceStateUpdate.js";

export type HumanAttendanceTransitionResult = {
  changed: boolean;
  previous: CrmConversationCycle;
  conversationCycle: CrmConversationCycle;
};

export async function transitionHumanAttendance(input: {
  actorId: string;
  actorKind: CrmInterventionActorKind;
  command: HumanAttendanceCommand;
  expectedRevision?: number;
  now?: Date;
  repository: CrmConversationRepository;
  conversationCycle: CrmConversationCycle;
}): Promise<HumanAttendanceTransitionResult> {
  let current = input.conversationCycle;
  const now = input.now ?? new Date();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (
      input.expectedRevision !== undefined &&
      current.revision !== input.expectedRevision
    ) {
      throw new ConversationCycleRevisionConflictError(current.id);
    }
    const update = humanAttendanceUpdate(current, input.command, now);
    if (!update)
      return { changed: false, previous: current, conversationCycle: current };
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
        conversationCycle: persisted.conversationCycle,
      };
    }
    if (input.expectedRevision !== undefined) {
      throw new ConversationCycleRevisionConflictError(current.id);
    }
    const [reloaded] = await input.repository.listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: current.id,
      storeId: current.storeId,
      tenantId: current.tenantId,
    });
    if (!reloaded)
      throw new Error("CRM WhatsApp conversationCycle disappeared.");
    current = reloaded;
  }
  throw new Error("CRM WhatsApp attendance transition conflicted repeatedly.");
}
