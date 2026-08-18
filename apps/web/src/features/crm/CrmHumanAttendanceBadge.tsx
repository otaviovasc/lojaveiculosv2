import { Circle } from "lucide-react";
import { readCrmHumanAttendance } from "./crmHumanAttendance";
import type { CrmConversationCycle } from "./crmConversationTypes";

export function CrmHumanAttendanceBadge({
  cycle,
}: {
  cycle: Pick<CrmConversationCycle, "humanAttendanceState">;
}) {
  const attendance = readCrmHumanAttendance(cycle);
  if (!attendance) return null;

  return (
    <span className={`crm-human-attendance ${attendance.className}`}>
      <Circle aria-hidden="true" />
      {attendance.label}
    </span>
  );
}
