import { CustomSelect } from "../../components/ui/CustomSelect";
import type {
  CrmAssignableMember,
  CrmConversationCycle,
} from "./crmConversationTypes";

export function ChatAssignmentSelect({
  assignableMembers,
  disabled,
  onAssign,
  cycle,
}: {
  assignableMembers: CrmAssignableMember[];
  disabled: boolean;
  onAssign: (agentId: string | null) => void;
  cycle: CrmConversationCycle;
}) {
  return (
    <CustomSelect
      ariaLabel="Atribuir conversa"
      className="crm-select"
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
      value={cycle.assignedUserId ? String(cycle.assignedUserId) : ""}
    />
  );
}
