import {
  Bot,
  CheckCheck,
  CircleAlert,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { CustomSelect } from "../../components/ui/CustomSelect";
import {
  formatRelativeSessionTime,
  formatSessionName,
  formatSessionPreview,
} from "./crmWhatsappModel";
import type { CrmWhatsappAgent, CrmWhatsappSession } from "./crmWhatsappTypes";

export function WhatsappToolbar({
  onSearch,
  search,
}: {
  onSearch: (value: string) => void;
  search: string;
}) {
  return (
    <section className="crm-whatsapp-toolbar">
      <label className="crm-whatsapp-search">
        <Search aria-hidden="true" className="size-4" />
        <input
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar por contato, telefone ou mensagem"
          value={search}
        />
      </label>
    </section>
  );
}

export function SessionList({
  activeSessionId,
  onSelect,
  sessions,
}: {
  activeSessionId: number | null;
  onSelect: (sessionId: number) => void;
  sessions: CrmWhatsappSession[];
}) {
  return (
    <aside className="crm-whatsapp-list" aria-label="Conversas do WhatsApp">
      {sessions.map((session) => (
        <button
          className={
            activeSessionId === session.id
              ? "crm-whatsapp-session crm-whatsapp-session-active"
              : "crm-whatsapp-session"
          }
          key={session.id}
          onClick={() => onSelect(session.id)}
          type="button"
        >
          <span className="crm-whatsapp-avatar">
            {formatSessionName(session).slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="crm-whatsapp-session-top">
              <strong>{formatSessionName(session)}</strong>
              <small>{formatRelativeSessionTime(session.lastMessageAt)}</small>
            </span>
            <span className="crm-whatsapp-session-preview">
              {formatSessionPreview(session)}
            </span>
            <span className="crm-whatsapp-session-meta">
              <ChannelBadge channel={session.channel} />
              {session.assignedAgent?.name
                ? session.assignedAgent.name
                : "Sem dono"}
            </span>
          </span>
          {(session.unreadCount ?? 0) > 0 ? (
            <span className="crm-unread">{session.unreadCount}</span>
          ) : null}
        </button>
      ))}
    </aside>
  );
}

export function ChatHeader({
  agents,
  canAssignSession,
  onAssign,
  onClose,
  onToggleIntervention,
  session,
}: {
  agents: CrmWhatsappAgent[];
  canAssignSession: boolean;
  onAssign: (agentId: number | null) => void;
  onClose: () => void;
  onToggleIntervention: () => void;
  session: CrmWhatsappSession;
}) {
  return (
    <header className="crm-whatsapp-chat-header">
      <div className="crm-whatsapp-chat-title">
        <span className="crm-whatsapp-avatar crm-whatsapp-avatar-lg">
          {formatSessionName(session).slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h3>{formatSessionName(session)}</h3>
          <p>{session.vehicle?.title ?? session.buyerPhone ?? "Negociacao"}</p>
        </div>
      </div>
      <div className="crm-whatsapp-header-actions">
        <button
          aria-label="Alternar atendimento humano"
          className={
            session.status === "HUMAN_TAKEOVER"
              ? "crm-icon-action crm-icon-action-active"
              : "crm-icon-action"
          }
          onClick={onToggleIntervention}
          title="Alternar atendimento humano"
          type="button"
        >
          {session.status === "HUMAN_TAKEOVER" ? <UserRound /> : <Bot />}
        </button>
        {canAssignSession ? (
          <CustomSelect
            aria-label="Atribuir conversa"
            className="crm-whatsapp-select"
            onChange={(agentId) => onAssign(agentId ? Number(agentId) : null)}
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
        <button className="crm-action" onClick={onClose} type="button">
          <CheckCheck aria-hidden="true" className="size-4" />
          Concluir
        </button>
      </div>
    </header>
  );
}

export function MessageComposer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    setText("");
    const accepted = await onSend(value);
    if (!accepted) setText(value);
  };

  return (
    <form
      className="crm-whatsapp-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <button aria-label="Anexos" className="crm-icon-action" type="button">
        <MoreHorizontal />
      </button>
      <textarea
        disabled={disabled}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder="Digite uma mensagem..."
        rows={1}
        value={text}
      />
      <button
        aria-label="Enviar mensagem"
        className="crm-icon-action crm-icon-action-active"
        disabled={disabled || !text.trim()}
        type="submit"
      >
        <Send />
      </button>
    </form>
  );
}

export function WhatsappNotice({ message }: { message: string }) {
  return (
    <section className="crm-note">
      <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
      <span>{message}</span>
    </section>
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
