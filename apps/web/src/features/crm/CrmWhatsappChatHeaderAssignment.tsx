import { CustomSelect } from "../../components/ui/CustomSelect";
import type {
  CrmWhatsappAssignableMember,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

export function ChatAssignmentSelect({
  assignableMembers,
  disabled,
  onAssign,
  session,
}: {
  assignableMembers: CrmWhatsappAssignableMember[];
  disabled: boolean;
  onAssign: (agentId: string | null) => void;
  session: CrmWhatsappSession;
}) {
  return (
    <CustomSelect
      ariaLabel="Atribuir conversa"
      className="crm-whatsapp-select"
      disabled={disabled}
      onChange={(agentId) => onAssign(agentId || null)}
      options={[
        { label: "Sem atribuicao", value: "" },
        ...assignableMembers
          .filter((member) => member.isActive)
          .map((member) => ({
            label: member.name,
            value: String(member.id),
          })),
      ]}
      value={session.assignedUserId ? String(session.assignedUserId) : ""}
    />
  );
}
