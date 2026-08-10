import type {
  CrmWhatsappHumanAttendanceState,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

export const crmWhatsappHumanAttendanceConfig = {
  IN_HUMAN_SERVICE: {
    className: "crm-whatsapp-human-attendance-in-service",
    label: "Em atendimento Humano",
  },
  WAITING_HUMAN: {
    className: "crm-whatsapp-human-attendance-waiting",
    label: "Aguardando Humano",
  },
} as const satisfies Record<
  CrmWhatsappHumanAttendanceState,
  { className: string; label: string }
>;

export function readCrmWhatsappHumanAttendance(
  session: Pick<CrmWhatsappSession, "humanAttendanceState">,
) {
  return session.humanAttendanceState
    ? crmWhatsappHumanAttendanceConfig[session.humanAttendanceState]
    : null;
}
