import {
  CheckCheck,
  CheckSquare,
  MailCheck,
  MailOpen,
  UserCheck,
  X,
} from "lucide-react";
import { CrmSelect } from "./CrmFormControls";
import { selectedCountLabel } from "./crmWhatsappQueueState";
import type { CrmWhatsappAssignableMember } from "./crmWhatsappTypes";

export function WhatsappBulkBar({
  assignableMembers,
  canAssign,
  canClose,
  canRead,
  onAssign,
  onClear,
  onClose,
  onMarkRead,
  onMarkUnread,
  onSelectAll,
  selectedCount,
  visible,
}: {
  assignableMembers: CrmWhatsappAssignableMember[];
  canAssign: boolean;
  canClose: boolean;
  canRead: boolean;
  onAssign: (assignedUserId: string | null) => void;
  onClear: () => void;
  onClose: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onSelectAll: () => void;
  selectedCount: number;
  visible?: boolean;
}) {
  if (!visible && selectedCount === 0) return null;
  const hasSelection = selectedCount > 0;
  return (
    <div className="crm-whatsapp-bulk-bar">
      <span className="crm-whatsapp-bulk-count">
        <CheckSquare aria-hidden="true" />
        <strong>
          {hasSelection
            ? selectedCountLabel(selectedCount)
            : "Selecione conversas"}
        </strong>
      </span>
      {canAssign ? (
        <div className="crm-whatsapp-bulk-group">
          <CrmSelect
            ariaLabel="Atribuir conversas selecionadas"
            disabled={!hasSelection}
            onChange={(value) => onAssign(value || null)}
            options={[
              { label: "Atribuir a...", value: "" },
              ...assignableMembers
                .filter((member) => member.isActive)
                .map((member) => ({
                  label: member.name,
                  value: String(member.id),
                })),
            ]}
            value=""
          />
          <button
            aria-label="Remover atribuição das conversas selecionadas"
            disabled={!hasSelection}
            onClick={() => onAssign(null)}
            type="button"
          >
            <UserCheck />
            Sem dono
          </button>
        </div>
      ) : null}
      <div className="crm-whatsapp-bulk-group">
        {canRead ? (
          <>
            <button
              aria-label="Marcar conversas selecionadas como lidas"
              disabled={!hasSelection}
              onClick={onMarkRead}
              type="button"
            >
              <MailCheck />
              Lidas
            </button>
            <button
              aria-label="Marcar conversas selecionadas como não lidas"
              disabled={!hasSelection}
              onClick={onMarkUnread}
              type="button"
            >
              <MailOpen />
              Não lidas
            </button>
          </>
        ) : null}
        {canClose ? (
          <button
            aria-label="Concluir conversas selecionadas"
            disabled={!hasSelection}
            onClick={onClose}
            type="button"
          >
            <CheckCheck />
            Concluir
          </button>
        ) : null}
      </div>
      <div className="crm-whatsapp-bulk-group crm-whatsapp-bulk-group-tail">
        <button
          aria-label="Selecionar conversas visíveis"
          onClick={onSelectAll}
          type="button"
        >
          <CheckSquare />
          Lista
        </button>
        <button aria-label="Limpar seleção" onClick={onClear} type="button">
          <X />
          Limpar
        </button>
      </div>
    </div>
  );
}
