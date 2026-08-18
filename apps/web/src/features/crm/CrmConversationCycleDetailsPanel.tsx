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
import { readCrmChannelLabel } from "./crmConnectionStatus";
import { readCrmHumanAttendance } from "./crmHumanAttendance";
import { formatCycleName } from "./crmConversationModel";
import type {
  CrmAssignableMember,
  CrmConversationCycle,
} from "./crmConversationTypes";

export function CrmConversationCycleDetailsPanel({
  assignableMembers,
  onClose,
  cycle,
}: {
  assignableMembers: CrmAssignableMember[];
  onClose: () => void;
  cycle: CrmConversationCycle;
}) {
  const name = formatCycleName(cycle);
  const agentName =
    cycle.assignedMember?.name ??
    assignableMembers.find(
      (member) => String(member.id) === String(cycle.assignedUserId),
    )?.name ??
    null;
  const attendance = readCrmHumanAttendance(cycle);
  const broker =
    typeof cycle.metadata?.broker === "string"
      ? readBrokerLabel(cycle.metadata.broker)
      : null;
  const attention = readAttention(cycle);
  const attendanceTitleId = useId();
  const opportunityTitleId = useId();
  const routeTitleId = useId();
  const tagsTitleId = useId();
  return (
    <aside
      aria-label="Detalhes da conversa"
      className="crm-details-panel"
      tabIndex={-1}
    >
      <header className="crm-details-header">
        <span className="crm-avatar crm-avatar-lg">
          {name.slice(0, 2).toUpperCase()}
        </span>
        <span className="crm-details-identity min-w-0">
          <small>Cliente</small>
          <strong>{name}</strong>
          {cycle.customerPhone && cycle.customerPhone !== name ? (
            <small>{cycle.customerPhone}</small>
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
        className="crm-details-section"
      >
        <h2 id={attendanceTitleId}>Atendimento</h2>
        <dl className="crm-details-list">
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
            value={attendance?.label ?? statusLabel(cycle.status)}
          />
          <DetailRow
            icon={<CalendarClock />}
            label="Última mensagem"
            value={formatDate(cycle.lastMessageAt)}
          />
        </dl>
      </section>
      <section aria-labelledby={routeTitleId} className="crm-details-section">
        <h2 id={routeTitleId}>Rota da conversa</h2>
        <dl className="crm-details-list">
          <DetailRow label="Canal" value={readCrmChannelLabel(cycle.channel)} />
          <DetailRow
            label="Transporte"
            value={readTransportLabel(cycle.connection?.provider)}
          />
          <DetailRow label="Broker" value={broker ?? "Não informado"} />
          <DetailRow
            label="Conexão"
            value={cycle.connection?.displayName ?? "Não informada"}
          />
        </dl>
      </section>
      <CrmWhatsappAdAttribution metadata={cycle.metadata} />
      <section
        aria-labelledby={opportunityTitleId}
        className="crm-details-section"
      >
        <h2 id={opportunityTitleId}>Oportunidade</h2>
        {cycle.leadId ? (
          <a
            className="crm-details-lead"
            href={`#/crm?surface=leads&leadId=${encodeURIComponent(cycle.leadId)}`}
          >
            <span>
              <small>Lead vinculado</small>
              <strong>{cycle.vehicle?.title ?? "Abrir oportunidade"}</strong>
            </span>
            <ExternalLink aria-hidden="true" />
          </a>
        ) : (
          <p className="crm-details-empty">
            Nenhuma oportunidade vinculada a esta conversa.
          </p>
        )}
      </section>
      {cycle.tags?.length ? (
        <section aria-labelledby={tagsTitleId} className="crm-details-section">
          <h2 id={tagsTitleId}>Marcadores</h2>
          <ul className="crm-details-tags">
            {cycle.tags.map((tag) => (
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
      className="crm-details-row"
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

function readAttention(cycle: CrmConversationCycle) {
  if (cycle.humanAttendanceState === "WAITING_HUMAN") {
    return { label: "Resposta humana necessária", requiresAction: true };
  }
  if ((cycle.unreadCount ?? 0) > 0) {
    const count = cycle.unreadCount ?? 0;
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
    case "meta_cloud":
    case "meta_cloud":
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
