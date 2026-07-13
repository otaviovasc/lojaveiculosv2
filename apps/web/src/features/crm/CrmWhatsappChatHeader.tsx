import {
  ArrowLeft,
  Bot,
  CalendarClock,
  ExternalLink,
  CheckCheck,
  MailCheck,
  MailOpen,
  MessageCircleMore,
  Tag,
  UserCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { ChatAssignmentSelect } from "./CrmWhatsappChatHeaderAssignment";
import { SessionTagRow } from "./CrmWhatsappChatHeaderTags";
import { formatSessionName } from "./crmWhatsappModel";
import { TagMenu } from "./CrmWhatsappTagMenu";
import type {
  CrmWhatsappAddSessionTagInput,
  CrmWhatsappAssignableMember,
  CrmWhatsappSession,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

export function ChatHeader({
  actionsDisabled,
  assignableMembers,
  availableTags,
  canAssignSession,
  canCloseSession,
  canMarkRead,
  canTagSessions,
  canScheduleMessages,
  canToggleIntervention,
  currentUserId,
  onAssign,
  onBack,
  onClose,
  onAddTag,
  onMarkRead,
  onMarkUnread,
  onOpenDetails,
  onRemoveTag,
  onScheduleMessage,
  onToggleIntervention,
  session,
}: {
  actionsDisabled?: boolean;
  assignableMembers: CrmWhatsappAssignableMember[];
  availableTags?: CrmWhatsappTag[];
  canAssignSession: boolean;
  canCloseSession: boolean;
  canMarkRead: boolean;
  canTagSessions: boolean;
  canScheduleMessages: boolean;
  canToggleIntervention: boolean;
  currentUserId?: string | null;
  onAddTag: (input: CrmWhatsappAddSessionTagInput) => Promise<boolean>;
  onAssign: (agentId: string | null) => void;
  onBack?: () => void;
  onClose: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onOpenDetails: () => void;
  onRemoveTag: (tagId: string) => Promise<boolean>;
  onScheduleMessage: () => void;
  onToggleIntervention: () => void;
  session: CrmWhatsappSession;
}) {
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const disabled = Boolean(actionsDisabled);
  const assignedToCurrentUser =
    Boolean(currentUserId) && session.assignedUserId === currentUserId;
  return (
    <header className="crm-whatsapp-chat-header">
      <div className="crm-whatsapp-chat-header-main">
        {onBack ? (
          <button
            aria-label="Voltar para conversas"
            className="crm-icon-action crm-whatsapp-mobile-back"
            onClick={onBack}
            title="Voltar para conversas"
            type="button"
          >
            <ArrowLeft />
          </button>
        ) : null}
        <div className="crm-whatsapp-chat-identity">
          <button
            aria-label="Abrir detalhes da conversa"
            className="crm-whatsapp-chat-title"
            onClick={onOpenDetails}
            type="button"
          >
            <span className="crm-whatsapp-avatar crm-whatsapp-avatar-lg">
              {session.profilePhotoUrl ? (
                <img alt="" src={session.profilePhotoUrl} />
              ) : (
                formatSessionName(session).slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="min-w-0">
              <h3>{formatSessionName(session)}</h3>
              <p>
                {session.vehicle?.title ?? session.buyerPhone ?? "Negociacao"}
              </p>
            </span>
          </button>
          <span className="crm-whatsapp-chat-channel-pill">
            <MessageCircleMore aria-hidden="true" />
            WhatsApp
          </span>
          <SessionTagRow
            disabled={disabled || !canTagSessions}
            onRemoveTag={onRemoveTag}
            tags={session.sessionTags ?? []}
          />
        </div>
      </div>
      <div className="crm-whatsapp-header-actions">
        {canMarkRead ? (
          <button
            aria-label={
              session.unreadCount
                ? "Marcar conversa como lida"
                : "Marcar conversa como nao lida"
            }
            className="crm-icon-action crm-whatsapp-header-action-secondary"
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
        {canTagSessions ? (
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
        {canScheduleMessages ? (
          <button
            aria-label="Abrir agendamentos"
            className="crm-icon-action crm-whatsapp-header-action-secondary"
            disabled={disabled}
            onClick={onScheduleMessage}
            title="Agendamentos"
            type="button"
          >
            <CalendarClock />
          </button>
        ) : null}
        {session.leadId ? (
          <a
            aria-label="Abrir lead vinculado"
            className="crm-icon-action crm-whatsapp-header-action-secondary"
            href={`#/crm?surface=leads&leadId=${encodeURIComponent(session.leadId)}`}
            title="Abrir lead vinculado"
          >
            <ExternalLink />
          </a>
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
          <ChatAssignmentSelect
            assignableMembers={assignableMembers}
            disabled={disabled}
            onAssign={onAssign}
            session={session}
          />
        ) : null}
        {currentUserId && canAssignSession ? (
          <button
            aria-label={assignedToCurrentUser ? "Meu atendimento" : "Assumir"}
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
            <span className="crm-whatsapp-action-label">
              {assignedToCurrentUser ? "Meu atendimento" : "Assumir"}
            </span>
          </button>
        ) : null}
        {canCloseSession ? (
          <button
            aria-label="Concluir"
            className="crm-action"
            disabled={disabled}
            onClick={onClose}
            type="button"
          >
            <CheckCheck aria-hidden="true" className="size-4" />
            <span className="crm-whatsapp-action-label">Concluir</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
