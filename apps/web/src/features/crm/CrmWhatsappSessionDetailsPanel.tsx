import {
  CalendarClock,
  ExternalLink,
  Phone,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { formatSessionName } from "./crmWhatsappModel";
import type { CrmWhatsappAgent, CrmWhatsappSession } from "./crmWhatsappTypes";

export function CrmWhatsappSessionDetailsPanel({
  agents,
  onClose,
  session,
}: {
  agents: CrmWhatsappAgent[];
  onClose: () => void;
  session: CrmWhatsappSession;
}) {
  const name = formatSessionName(session);
  const agentName =
    session.assignedAgent?.name ??
    agents.find((agent) => String(agent.id) === String(session.assignedAgentId))
      ?.name ??
    null;
  return (
    <aside
      aria-label="Detalhes da conversa"
      className="crm-whatsapp-details-panel"
    >
      <header>
        <span className="crm-whatsapp-avatar crm-whatsapp-avatar-lg">
          {name.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0">
          <strong>{name}</strong>
          <small>{session.buyerPhone ?? "Telefone nao informado"}</small>
        </span>
        <button
          aria-label="Fechar detalhes"
          className="crm-icon-action"
          onClick={onClose}
          type="button"
        >
          <X />
        </button>
      </header>
      <div className="crm-whatsapp-details-grid">
        <DetailRow
          icon={<Phone />}
          label="Telefone"
          value={session.buyerPhone ?? null}
        />
        <DetailRow
          icon={<UserRound />}
          label="Atendente"
          value={agentName ?? "Sem dono"}
        />
        <DetailRow
          icon={<CalendarClock />}
          label="Ultima mensagem"
          value={formatDate(session.lastMessageAt)}
        />
        <DetailRow
          icon={<Tag />}
          label="Status"
          value={statusLabel(session.status)}
        />
      </div>
      {session.leadId ? (
        <a
          className="crm-whatsapp-details-lead"
          href={`#/crm?surface=leads&leadId=${encodeURIComponent(session.leadId)}`}
        >
          <span>
            <strong>Lead vinculado</strong>
            <small>{session.leadId}</small>
          </span>
          <ExternalLink aria-hidden="true" />
        </a>
      ) : (
        <div className="crm-whatsapp-details-empty">
          Esta conversa ainda nao tem lead vinculado.
        </div>
      )}
      {session.sessionTags?.length ? (
        <div className="crm-whatsapp-details-tags">
          {session.sessionTags.map((tag) => (
            <span key={tag.id}>
              <i
                aria-hidden="true"
                style={{ backgroundColor: tag.color ?? "var(--color-muted)" }}
              />
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <span className="crm-whatsapp-details-row">
      {icon}
      <span>
        <small>{label}</small>
        <strong>{value || "-"}</strong>
      </span>
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

function statusLabel(status: string) {
  if (status === "HUMAN_TAKEOVER") return "Atendimento humano";
  if (status === "MINIBOT_ACTIVE") return "Minibot ativo";
  if (status === "COMPLETED") return "Concluida";
  if (status === "EXPIRED") return "Expirada";
  return "Ativa";
}
