import {
  CalendarClock,
  CircleAlert,
  ExternalLink,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { useId, type ReactNode } from "react";
import { CrmWhatsappAdAttribution } from "./CrmWhatsappAdAttribution";
import { readCrmWhatsappChannelLabel } from "./crmWhatsappConnectionStatus";
import { readCrmWhatsappHumanAttendance } from "./crmWhatsappHumanAttendance";
import { formatSessionName } from "./crmWhatsappModel";
import type {
  CrmWhatsappAssignableMember,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

export function CrmWhatsappSessionDetailsPanel({
  assignableMembers,
  onClose,
  session,
}: {
  assignableMembers: CrmWhatsappAssignableMember[];
  onClose: () => void;
  session: CrmWhatsappSession;
}) {
  const name = formatSessionName(session);
  const agentName =
    session.assignedMember?.name ??
    assignableMembers.find(
      (member) => String(member.id) === String(session.assignedUserId),
    )?.name ??
    null;
  const attendance = readCrmWhatsappHumanAttendance(session);
  const broker =
    typeof session.metadata?.broker === "string"
      ? readBrokerLabel(session.metadata.broker)
      : null;
  const attention = readAttention(session);
  const attendanceTitleId = useId();
  const opportunityTitleId = useId();
  const routeTitleId = useId();
  const tagsTitleId = useId();
  return (
    <aside
      aria-label="Detalhes da conversa"
      className="crm-whatsapp-details-panel"
      tabIndex={-1}
    >
      <header className="crm-whatsapp-details-header">
        <span className="crm-whatsapp-avatar crm-whatsapp-avatar-lg">
          {name.slice(0, 2).toUpperCase()}
        </span>
        <span className="crm-whatsapp-details-identity min-w-0">
          <small>Cliente</small>
          <strong>{name}</strong>
          {session.buyerPhone && session.buyerPhone !== name ? (
            <small>{session.buyerPhone}</small>
          ) : null}
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
      <section
        aria-labelledby={attendanceTitleId}
        className="crm-whatsapp-details-section"
      >
        <h2 id={attendanceTitleId}>Atendimento</h2>
        <dl className="crm-whatsapp-details-list">
          <DetailRow
            emphasis={attention.requiresAction}
            icon={<CircleAlert />}
            label="Atenção"
            value={attention.label}
          />
          <DetailRow
            icon={<UserRound />}
            label="Atendente"
            value={agentName ?? "Sem responsável"}
          />
          <DetailRow
            icon={<Tag />}
            label="Estado"
            value={attendance?.label ?? statusLabel(session.status)}
          />
          <DetailRow
            icon={<CalendarClock />}
            label="Última mensagem"
            value={formatDate(session.lastMessageAt)}
          />
        </dl>
      </section>
      <section
        aria-labelledby={routeTitleId}
        className="crm-whatsapp-details-section"
      >
        <h2 id={routeTitleId}>Rota da conversa</h2>
        <dl className="crm-whatsapp-details-list">
          <DetailRow
            label="Canal"
            value={readCrmWhatsappChannelLabel(session.channel)}
          />
          <DetailRow
            label="Transporte"
            value={readTransportLabel(session.connection?.provider)}
          />
          <DetailRow label="Broker" value={broker ?? "Não informado"} />
          <DetailRow
            label="Conexão"
            value={session.connection?.name ?? "Não informada"}
          />
        </dl>
      </section>
      <CrmWhatsappAdAttribution metadata={session.metadata} />
      <section
        aria-labelledby={opportunityTitleId}
        className="crm-whatsapp-details-section"
      >
        <h2 id={opportunityTitleId}>Oportunidade</h2>
        {session.leadId ? (
          <a
            className="crm-whatsapp-details-lead"
            href={`#/crm?surface=leads&leadId=${encodeURIComponent(session.leadId)}`}
          >
            <span>
              <small>Lead vinculado</small>
              <strong>{session.vehicle?.title ?? "Abrir oportunidade"}</strong>
            </span>
            <ExternalLink aria-hidden="true" />
          </a>
        ) : (
          <p className="crm-whatsapp-details-empty">
            Nenhuma oportunidade vinculada a esta conversa.
          </p>
        )}
      </section>
      {session.sessionTags?.length ? (
        <section
          aria-labelledby={tagsTitleId}
          className="crm-whatsapp-details-section"
        >
          <h2 id={tagsTitleId}>Marcadores</h2>
          <ul className="crm-whatsapp-details-tags">
            {session.sessionTags.map((tag) => (
              <li key={tag.id}>
                <Tag aria-hidden="true" />
                {tag.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}

function DetailRow({
  emphasis = false,
  icon,
  label,
  value,
}: {
  emphasis?: boolean;
  icon?: ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div
      className="crm-whatsapp-details-row"
      data-emphasis={emphasis ? "action" : undefined}
    >
      <dt>
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        {label}
      </dt>
      <dd>{value || "-"}</dd>
    </div>
  );
}

function readAttention(session: CrmWhatsappSession) {
  if (session.humanAttendanceState === "WAITING_HUMAN") {
    return { label: "Resposta humana necessária", requiresAction: true };
  }
  if ((session.unreadCount ?? 0) > 0) {
    const count = session.unreadCount ?? 0;
    return {
      label: `${count} ${count === 1 ? "mensagem não lida" : "mensagens não lidas"}`,
      requiresAction: true,
    };
  }
  return { label: "Sem pendências imediatas", requiresAction: false };
}

function readTransportLabel(provider?: string | null) {
  switch (provider) {
    case "meta_cloud":
    case "composio_instagram":
    case "composio_whatsapp":
      return "Meta Cloud";
    case "olx":
    case "olx_chat":
      return "OLX";
    case "zapi":
      return "Z-API";
    case null:
    case undefined:
    default:
      return "Não informado";
  }
}

function readBrokerLabel(broker: string) {
  switch (broker.trim().toLowerCase()) {
    case "composio":
      return "Composio";
    case "direct":
      return "Direto";
    default:
      return null;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

function statusLabel(status: string) {
  if (status === "HUMAN_TAKEOVER") return "-";
  if (status === "MINIBOT_ACTIVE") return "Minibot ativo";
  if (status === "COMPLETED") return "Concluida";
  if (status === "EXPIRED") return "Expirada";
  return "Ativa";
}
