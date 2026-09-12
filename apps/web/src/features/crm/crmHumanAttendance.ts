import type {
  CrmHumanAttendanceState,
  CrmConversationCycle,
} from "./crmConversationTypes";

export const crmHumanAttendanceConfig = {
  IN_HUMAN_SERVICE: {
    className: "crm-human-attendance-in-service",
    label: "Em atendimento Humano",
  },
  WAITING_HUMAN: {
    className: "crm-human-attendance-waiting",
    label: "Aguardando Humano",
  },
} as const satisfies Record<
  CrmHumanAttendanceState,
  { className: string; label: string }
>;

export function readCrmHumanAttendance(
  cycle: Pick<CrmConversationCycle, "humanAttendanceState">,
) {
  return cycle.humanAttendanceState
    ? crmHumanAttendanceConfig[cycle.humanAttendanceState]
    : null;
}
