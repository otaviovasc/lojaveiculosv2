import {
  CheckCheck,
  CheckSquare,
  MailCheck,
  MailOpen,
  UserCheck,
  X,
} from "lucide-react";
import { selectedCountLabel } from "./crmWhatsappQueueState";
import type { CrmWhatsappAgent } from "./crmWhatsappTypes";

export function WhatsappBulkBar({
  agents,
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
}: {
  agents: CrmWhatsappAgent[];
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
}) {
  if (selectedCount === 0) return null;
  return (
    <div className="crm-whatsapp-bulk-bar">
      <span className="crm-whatsapp-bulk-count">
        <CheckSquare aria-hidden="true" />
        <strong>{selectedCountLabel(selectedCount)}</strong>
      </span>
      {canAssign ? (
        <div className="crm-whatsapp-bulk-group">
          <select
            aria-label="Atribuir conversas selecionadas"
            onChange={(event) => onAssign(event.target.value || null)}
            value=""
          >
            <option value="">Atribuir a...</option>
            {agents
              .filter((agent) => agent.isActive)
              .map((agent) => (
                <option key={agent.id} value={String(agent.id)}>
                  {agent.name}
                </option>
              ))}
          </select>
          <button
            aria-label="Remover atribuicao das conversas selecionadas"
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
              onClick={onMarkRead}
              type="button"
            >
              <MailCheck />
              Lidas
            </button>
            <button
              aria-label="Marcar conversas selecionadas como nao lidas"
              onClick={onMarkUnread}
              type="button"
            >
              <MailOpen />
              Nao lidas
            </button>
          </>
        ) : null}
        {canClose ? (
          <button
            aria-label="Concluir conversas selecionadas"
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
          aria-label="Selecionar conversas visiveis"
          onClick={onSelectAll}
          type="button"
        >
          <CheckSquare />
          Lista
        </button>
        <button aria-label="Limpar selecao" onClick={onClear} type="button">
          <X />
          Limpar
        </button>
      </div>
    </div>
  );
}
