import { Headset, Hourglass } from "lucide-react";
import { readCrmHumanAttendance } from "./crmHumanAttendance";
import type { CrmConversationCycle } from "./crmConversationTypes";

export function CrmHumanAttendanceBadge({
  cycle,
}: {
  cycle: Pick<CrmConversationCycle, "humanAttendanceState">;
}) {
  const attendance = readCrmHumanAttendance(cycle);
  if (!attendance) return null;

  const isWaiting = cycle.humanAttendanceState === "WAITING_HUMAN";

  return (
    <span className={`crm-human-attendance ${attendance.className}`}>
      {isWaiting ? (
        <Hourglass aria-hidden="true" />
      ) : (
        <Headset aria-hidden="true" />
      )}
      {attendance.label}
    </span>
  );
}
