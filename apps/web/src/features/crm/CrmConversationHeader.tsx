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
import { useRef, useState } from "react";
import { FeatureAnchoredPopover } from "../../components/ui/FeaturePopover";
import { ChatAssignmentSelect } from "./CrmConversationHeaderAssignment";
import { CrmHumanAttendanceBadge } from "./CrmHumanAttendanceBadge";
import { SessionTagRow } from "./CrmConversationHeaderTags";
import {
  formatCycleAvatarInitials,
  formatCycleName,
} from "./crmConversationModel";
import {
  readCrmChannelLabel,
  readCrmProviderLabel,
} from "./crmConnectionStatus";
import { TagMenu } from "./CrmTagMenu";
import type {
  CrmAddConversationCycleTagInput,
  CrmAssignableMember,
  CrmConversationCycle,
  CrmTag,
} from "./crmConversationTypes";

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
  pendingActions,
  cycle,
}: {
  actionsDisabled?: boolean;
  assignableMembers: CrmAssignableMember[];
  availableTags?: CrmTag[];
  canAssignSession: boolean;
  canCloseSession: boolean;
  canMarkRead: boolean;
  canTagSessions: boolean;
  canScheduleMessages: boolean;
  canToggleIntervention: boolean;
  currentUserId?: string | null;
  onAddTag: (input: CrmAddConversationCycleTagInput) => Promise<boolean>;
  onAssign: (agentId: string | null) => void;
  onBack?: () => void;
  onClose: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onOpenDetails: () => void;
  onRemoveTag: (tagId: string) => Promise<boolean>;
  onScheduleMessage: () => void;
  onToggleIntervention: () => void;
  pendingActions?: Partial<
    Record<"assign" | "intervention" | "read" | "tag", boolean>
  >;
  cycle: CrmConversationCycle;
}) {
  const tagButtonRef = useRef<HTMLButtonElement>(null);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const disabled = Boolean(actionsDisabled);
  const assignedToCurrentUser =
    Boolean(currentUserId) && cycle.assignedUserId === currentUserId;
  return (
    <header className="crm-chat-header">
      <div className="crm-chat-header-main">
        {onBack ? (
          <button
            aria-label="Voltar para conversas"
            className="crm-icon-action crm-mobile-back"
            onClick={onBack}
            title="Voltar para conversas"
            type="button"
          >
            <ArrowLeft />
          </button>
        ) : null}
        <div className="crm-chat-identity">
          <button
            aria-label="Abrir detalhes da conversa"
            className="crm-chat-title"
            onClick={onOpenDetails}
            type="button"
          >
            <span className="crm-avatar crm-avatar-lg">
              {cycle.profilePhotoUrl ? (
                <img alt="" src={cycle.profilePhotoUrl} />
              ) : (
                formatCycleAvatarInitials(cycle)
              )}
            </span>
            <span className="min-w-0">
              <h3>{formatCycleName(cycle)}</h3>
              <p>
                {cycle.vehicle?.title ??
                  (cycle.customerPhone &&
                  cycle.customerPhone !== formatCycleName(cycle)
                    ? cycle.customerPhone
                    : null) ??
                  "Negociacao"}
              </p>
            </span>
          </button>
          <span
            className="crm-chat-channel-pill"
            data-channel={(cycle.channel ?? "whatsapp").toLowerCase()}
          >
            <MessageCircleMore aria-hidden="true" />
            {readCrmChannelLabel(cycle.channel)}
            <small>
              {readCrmProviderLabel(cycle.connection?.provider ?? "unknown")}
            </small>
          </span>
          <CrmHumanAttendanceBadge cycle={cycle} />
          <SessionTagRow
            disabled={disabled || pendingActions?.tag || !canTagSessions}
            onRemoveTag={onRemoveTag}
            tags={cycle.tags ?? []}
          />
        </div>
      </div>
      <div className="crm-header-actions">
        {canMarkRead || canTagSessions ? (
          <div
            aria-label="Ações da conversa"
            className="crm-header-action-group"
            role="group"
          >
            {canMarkRead ? (
              <button
                aria-label={
                  cycle.unreadCount
                    ? "Marcar conversa como lida"
                    : "Marcar conversa como nao lida"
                }
                className="crm-icon-action crm-header-action-secondary"
                disabled={disabled || pendingActions?.read}
                onClick={cycle.unreadCount ? onMarkRead : onMarkUnread}
                title={
                  cycle.unreadCount
                    ? "Marcar como lida"
                    : "Marcar como nao lida"
                }
                type="button"
              >
                {cycle.unreadCount ? <MailCheck /> : <MailOpen />}
              </button>
            ) : null}
            {canTagSessions ? (
              <div className="crm-tag-menu-anchor">
                <button
                  aria-label="Adicionar etiqueta"
                  className="crm-icon-action"
                  disabled={disabled || pendingActions?.tag}
                  onClick={() => setTagMenuOpen((open) => !open)}
                  ref={tagButtonRef}
                  title="Adicionar etiqueta"
                  type="button"
                >
                  <Tag />
                </button>
                <FeatureAnchoredPopover
                  align="end"
                  anchorRef={tagButtonRef}
                  className="crm-tag-popover"
                  isOpen={tagMenuOpen}
                  onClose={() => setTagMenuOpen(false)}
                >
                  <TagMenu
                    activeTags={cycle.tags ?? []}
                    availableTags={availableTags ?? []}
                    disabled={disabled || Boolean(pendingActions?.tag)}
                    onAdd={async (input) => {
                      const accepted = await onAddTag(input);
                      if (accepted) setTagMenuOpen(false);
                      return accepted;
                    }}
                  />
                </FeatureAnchoredPopover>
              </div>
            ) : null}
          </div>
        ) : null}
        {canScheduleMessages || cycle.leadId || canToggleIntervention ? (
          <div
            aria-label="Ferramentas do atendimento"
            className="crm-header-action-group"
            role="group"
          >
            {canScheduleMessages ? (
              <button
                aria-label="Abrir agendamentos"
                className="crm-icon-action crm-header-action-secondary"
                disabled={disabled}
                onClick={onScheduleMessage}
                title="Agendamentos"
                type="button"
              >
                <CalendarClock />
              </button>
            ) : null}
            {cycle.leadId ? (
              <a
                aria-label="Abrir lead vinculado"
                className="crm-icon-action crm-header-action-secondary"
                href={`#/crm?surface=leads&leadId=${encodeURIComponent(cycle.leadId)}`}
                title="Abrir lead vinculado"
              >
                <ExternalLink />
              </a>
            ) : null}
            {canToggleIntervention ? (
              <button
                aria-label="Alternar atendimento humano"
                className={
                  cycle.status === "HUMAN_TAKEOVER"
                    ? "crm-icon-action crm-icon-action-active"
                    : "crm-icon-action"
                }
                disabled={disabled || pendingActions?.intervention}
                onClick={onToggleIntervention}
                title="Alternar atendimento humano"
                type="button"
              >
                {cycle.status === "HUMAN_TAKEOVER" ? <UserRound /> : <Bot />}
              </button>
            ) : null}
          </div>
        ) : null}
        {canAssignSession || canCloseSession ? (
          <div
            aria-label="Responsabilidade pelo atendimento"
            className="crm-header-action-group crm-header-action-group-primary"
            role="group"
          >
            {canAssignSession ? (
              <ChatAssignmentSelect
                assignableMembers={assignableMembers}
                disabled={disabled || Boolean(pendingActions?.assign)}
                onAssign={onAssign}
                cycle={cycle}
              />
            ) : null}
            {currentUserId && canAssignSession ? (
              <button
                aria-label={
                  assignedToCurrentUser ? "Meu atendimento" : "Assumir"
                }
                className={
                  assignedToCurrentUser
                    ? "crm-action crm-action-muted"
                    : "crm-action"
                }
                disabled={
                  disabled || pendingActions?.assign || assignedToCurrentUser
                }
                onClick={() => onAssign(currentUserId)}
                type="button"
              >
                <UserCheck aria-hidden="true" className="size-4" />
                <span className="crm-action-label">
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
                <span className="crm-action-label">Concluir</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
