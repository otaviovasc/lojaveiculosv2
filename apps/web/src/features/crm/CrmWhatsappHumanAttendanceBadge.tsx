import { Circle } from "lucide-react";
import { readCrmWhatsappHumanAttendance } from "./crmWhatsappHumanAttendance";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

export function CrmWhatsappHumanAttendanceBadge({
  session,
}: {
  session: Pick<CrmWhatsappSession, "humanAttendanceState">;
}) {
  const attendance = readCrmWhatsappHumanAttendance(session);
  if (!attendance) return null;

  return (
    <span className={`crm-whatsapp-human-attendance ${attendance.className}`}>
      <Circle aria-hidden="true" />
      {attendance.label}
    </span>
  );
}
