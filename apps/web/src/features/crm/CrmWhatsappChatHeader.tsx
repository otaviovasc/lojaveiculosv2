import {
  Bot,
  CheckCheck,
  MailCheck,
  MailOpen,
  Tag,
  X,
  UserCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { formatSessionName } from "./crmWhatsappModel";
import { TagMenu } from "./CrmWhatsappTagMenu";
import type {
  CrmWhatsappAddSessionTagInput,
  CrmWhatsappAgent,
  CrmWhatsappSession,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

export function ChatHeader({
  actionsDisabled,
  agents,
  availableTags,
  canAssignSession,
  canCloseSession,
  canMarkRead,
  canSendMessages,
  canToggleIntervention,
  currentUserId,
  onAssign,
  onClose,
  onAddTag,
  onMarkRead,
  onMarkUnread,
  onOpenDetails,
  onRemoveTag,
  onToggleIntervention,
  session,
}: {
  actionsDisabled?: boolean;
  agents: CrmWhatsappAgent[];
  availableTags?: CrmWhatsappTag[];
  canAssignSession: boolean;
  canCloseSession: boolean;
  canMarkRead: boolean;
  canSendMessages: boolean;
  canToggleIntervention: boolean;
  currentUserId?: string | null;
  onAddTag: (input: CrmWhatsappAddSessionTagInput) => Promise<boolean>;
  onAssign: (agentId: string | null) => void;
  onClose: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onOpenDetails: () => void;
  onRemoveTag: (tagId: string) => Promise<boolean>;
  onToggleIntervention: () => void;
  session: CrmWhatsappSession;
}) {
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const disabled = Boolean(actionsDisabled);
  const assignedToCurrentUser =
    Boolean(currentUserId) && session.assignedAgentId === currentUserId;
  return (
    <header className="crm-whatsapp-chat-header">
      <div className="crm-whatsapp-chat-identity">
        <button
          aria-label="Abrir detalhes da conversa"
          className="crm-whatsapp-chat-title"
          onClick={onOpenDetails}
          type="button"
        >
          <span className="crm-whatsapp-avatar crm-whatsapp-avatar-lg">
            {formatSessionName(session).slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0">
            <h3>{formatSessionName(session)}</h3>
            <p>
              {session.vehicle?.title ?? session.buyerPhone ?? "Negociacao"}
            </p>
          </span>
        </button>
        <SessionTagRow
          disabled={disabled || !canSendMessages}
          onRemoveTag={onRemoveTag}
          tags={session.sessionTags ?? []}
        />
      </div>
      <div className="crm-whatsapp-header-actions">
        {canMarkRead ? (
          <button
            aria-label={
              session.unreadCount
                ? "Marcar conversa como lida"
                : "Marcar conversa como nao lida"
            }
            className="crm-icon-action"
            disabled={disabled}
            onClick={session.unreadCount ? onMarkRead : onMarkUnread}
            title={
              session.unreadCount ? "Marcar como lida" : "Marcar como nao lida"
            }
            type="button"
          >
            {session.unreadCount ? <MailCheck /> : <MailOpen />}
          </button>
        ) : null}
        {canSendMessages ? (
          <div className="crm-whatsapp-tag-menu-anchor">
            <button
              aria-label="Adicionar etiqueta"
              className="crm-icon-action"
              disabled={disabled}
              onClick={() => setTagMenuOpen((open) => !open)}
              title="Adicionar etiqueta"
              type="button"
            >
              <Tag />
            </button>
            {tagMenuOpen ? (
              <TagMenu
                activeTags={session.sessionTags ?? []}
                availableTags={availableTags ?? []}
                disabled={disabled}
                onAdd={async (input) => {
                  const accepted = await onAddTag(input);
                  if (accepted) setTagMenuOpen(false);
                  return accepted;
                }}
              />
            ) : null}
          </div>
        ) : null}
        {canToggleIntervention ? (
          <button
            aria-label="Alternar atendimento humano"
            className={
              session.status === "HUMAN_TAKEOVER"
                ? "crm-icon-action crm-icon-action-active"
                : "crm-icon-action"
            }
            disabled={disabled}
            onClick={onToggleIntervention}
            title="Alternar atendimento humano"
            type="button"
          >
            {session.status === "HUMAN_TAKEOVER" ? <UserRound /> : <Bot />}
          </button>
        ) : null}
        {canAssignSession ? (
          <CustomSelect
            ariaLabel="Atribuir conversa"
            className="crm-whatsapp-select"
            disabled={disabled}
            onChange={(agentId) => onAssign(agentId || null)}
            options={[
              { label: "Sem atribuicao", value: "" },
              ...agents
                .filter((agent) => agent.isActive)
                .map((agent) => ({
                  label: agent.name,
                  value: String(agent.id),
                })),
            ]}
            value={
              session.assignedAgentId ? String(session.assignedAgentId) : ""
            }
          />
        ) : null}
        {currentUserId && canAssignSession ? (
          <button
            className={
              assignedToCurrentUser
                ? "crm-action crm-action-muted"
                : "crm-action"
            }
            disabled={disabled || assignedToCurrentUser}
            onClick={() => onAssign(currentUserId)}
            type="button"
          >
            <UserCheck aria-hidden="true" className="size-4" />
            {assignedToCurrentUser ? "Meu atendimento" : "Assumir"}
          </button>
        ) : null}
        {canCloseSession ? (
          <button
            className="crm-action"
            disabled={disabled}
            onClick={onClose}
            type="button"
          >
            <CheckCheck aria-hidden="true" className="size-4" />
            Concluir
          </button>
        ) : null}
      </div>
    </header>
  );
}

function SessionTagRow({
  disabled,
  onRemoveTag,
  tags,
}: {
  disabled?: boolean;
  onRemoveTag: (tagId: string) => Promise<boolean>;
  tags: CrmWhatsappTag[];
}) {
  if (!tags.length) return null;
  return (
    <div className="crm-whatsapp-tag-row" aria-label="Etiquetas da conversa">
      {tags.slice(0, 4).map((tag) => (
        <span className="crm-whatsapp-tag-chip" key={tag.id}>
          <span
            aria-hidden="true"
            style={{ backgroundColor: tag.color ?? "var(--color-muted)" }}
          />
          {tag.name}
          <button
            aria-label={`Remover etiqueta ${tag.name}`}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              void onRemoveTag(tag.id);
            }}
            title="Remover etiqueta"
            type="button"
          >
            <X />
          </button>
        </span>
      ))}
      {tags.length > 4 ? (
        <span className="crm-whatsapp-tag-chip crm-whatsapp-tag-chip-muted">
          +{tags.length - 4}
        </span>
      ) : null}
    </div>
  );
}
