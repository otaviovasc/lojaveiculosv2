import { CheckSquare, MessageCircle, Phone, Square } from "lucide-react";
import {
  formatRelativeSessionTime,
  formatSessionName,
  formatSessionPreview,
} from "./crmWhatsappModel";
import type {
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";

export function SessionList({
  activeSessionId,
  onSelect,
  onToggleSelected,
  selectedSessionIds,
  sessions,
}: {
  activeSessionId: CrmWhatsappSessionId | null;
  onSelect: (sessionId: CrmWhatsappSessionId) => void;
  onToggleSelected: (sessionId: CrmWhatsappSessionId) => void;
  selectedSessionIds: string[];
  sessions: CrmWhatsappSession[];
}) {
  if (sessions.length === 0) {
    return (
      <div className="crm-whatsapp-empty crm-whatsapp-empty-list">
        Nenhuma conversa encontrada.
      </div>
    );
  }

  return (
    <div
      className="crm-whatsapp-session-list"
      aria-label="Conversas do WhatsApp"
    >
      {sessions.map((session) => (
        <div
          className={
            activeSessionId === session.id
              ? "crm-whatsapp-session crm-whatsapp-session-active"
              : "crm-whatsapp-session"
          }
          key={session.id}
        >
          <button
            aria-label={
              selectedSessionIds.includes(String(session.id))
                ? "Remover conversa da selecao"
                : "Selecionar conversa"
            }
            className="crm-whatsapp-session-pick"
            onClick={() => onToggleSelected(session.id)}
            type="button"
          >
            {selectedSessionIds.includes(String(session.id)) ? (
              <CheckSquare />
            ) : (
              <Square />
            )}
          </button>
          <button
            className="crm-whatsapp-session-main"
            onClick={() => onSelect(session.id)}
            type="button"
          >
            <span className="crm-whatsapp-avatar">
              {formatSessionName(session).slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="crm-whatsapp-session-top">
                <strong>{formatSessionName(session)}</strong>
                <small>
                  {formatRelativeSessionTime(session.lastMessageAt)}
                </small>
              </span>
              <span className="crm-whatsapp-session-preview">
                {formatSessionPreview(session)}
              </span>
              {session.sessionTags?.length ? (
                <span className="crm-whatsapp-session-tags">
                  {session.sessionTags.slice(0, 3).map((tag) => (
                    <span key={tag.id}>
                      <i
                        aria-hidden="true"
                        style={{
                          backgroundColor: tag.color ?? "var(--color-muted)",
                        }}
                      />
                      {tag.name}
                    </span>
                  ))}
                  {session.sessionTags.length > 3 ? (
                    <span>+{session.sessionTags.length - 3}</span>
                  ) : null}
                </span>
              ) : null}
              <span className="crm-whatsapp-session-meta">
                <ChannelBadge channel={session.channel} />
                {session.assignedAgent?.name
                  ? session.assignedAgent.name
                  : session.assignedAgentId
                    ? "Atribuido"
                    : "Sem dono"}
              </span>
            </span>
            {(session.unreadCount ?? 0) > 0 ? (
              <span className="crm-unread">{session.unreadCount}</span>
            ) : null}
          </button>
        </div>
      ))}
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === "WHATSAPP") {
    return (
      <span className="crm-whatsapp-channel">
        <Phone aria-hidden="true" className="size-3" />
        WhatsApp
      </span>
    );
  }
  return (
    <span className="crm-whatsapp-channel">
      <MessageCircle aria-hidden="true" className="size-3" />
      {channel === "OLX_CHAT" ? "OLX Chat" : channel}
    </span>
  );
}
