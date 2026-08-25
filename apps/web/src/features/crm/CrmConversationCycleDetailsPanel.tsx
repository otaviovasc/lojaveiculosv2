import {
  ArrowUpRight,
  Bot,
  CalendarClock,
  Car,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  ExternalLink,
  MessageCircle,
  Phone,
  Radio,
  Tag,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { CrmWhatsappAdAttribution } from "./CrmWhatsappAdAttribution";
import { readCrmChannelLabel } from "./crmConnectionStatus";
import { readCrmHumanAttendance } from "./crmHumanAttendance";
import { formatCycleName } from "./crmConversationModel";
import { formatCrmPhone } from "./crmPhoneFormat";
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
  const formattedPhone = formatCrmPhone(cycle.customerPhone);
  const [copiedPhone, setCopiedPhone] = useState(false);

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

  const handleCopyPhone = () => {
    if (formattedPhone) {
      void navigator.clipboard.writeText(formattedPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 1800);
    }
  };

  return (
    <aside
      aria-label="Detalhes da conversa"
      className="crm-details-panel"
      tabIndex={-1}
    >
      {/* Header */}
      <header className="crm-details-header">
        <div className="crm-details-header-top">
          <span className="crm-avatar crm-avatar-lg">
            {cycle.profilePhotoUrl ? (
              <img alt={name} src={cycle.profilePhotoUrl} />
            ) : (
              name.slice(0, 2).toUpperCase()
            )}
          </span>
          <button
            aria-label="Fechar detalhes"
            className="crm-icon-action crm-details-close-btn"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="crm-details-profile">
          <strong className="crm-details-name">{name}</strong>
          {formattedPhone && formattedPhone !== name ? (
            <div className="crm-details-phone-row">
              <span className="crm-details-phone">{formattedPhone}</span>
              <button
                aria-label="Copiar telefone"
                className="crm-details-copy-phone"
                onClick={handleCopyPhone}
                title="Copiar telefone"
                type="button"
              >
                {copiedPhone ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* Atendimento Card */}
      <section
        aria-labelledby={attendanceTitleId}
        className="crm-details-section"
      >
        <h2 id={attendanceTitleId} className="crm-details-section-title">
          Atendimento
        </h2>
        <div className="crm-details-card">
          <DetailRow
            emphasis={attention.requiresAction}
            icon={
              attention.requiresAction ? (
                <CircleAlert className="size-3.5 text-amber-500" />
              ) : (
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              )
            }
            label="Atenção"
            value={
              <span
                className={
                  attention.requiresAction
                    ? "crm-details-badge crm-details-badge-warning"
                    : "crm-details-badge crm-details-badge-neutral"
                }
              >
                {attention.label}
              </span>
            }
          />
          <DetailRow
            icon={<UserRound className="size-3.5 text-muted" />}
            label="Atendente"
            value={
              agentName ? (
                <span className="crm-details-badge crm-details-badge-primary">
                  <UserCheck className="size-3 mr-1" />
                  {agentName}
                </span>
              ) : (
                <span className="crm-details-muted">Sem responsável</span>
              )
            }
          />
          <DetailRow
            icon={<Tag className="size-3.5 text-muted" />}
            label="Estado"
            value={
              <span className="crm-details-badge crm-details-badge-neutral">
                {attendance?.label ?? statusLabel(cycle.status)}
              </span>
            }
          />
          <DetailRow
            icon={<CalendarClock className="size-3.5 text-muted" />}
            label="Última mensagem"
            value={formatDate(cycle.lastMessageAt)}
          />
        </div>
      </section>

      {/* Oportunidade / Veículo Card */}
      <section
        aria-labelledby={opportunityTitleId}
        className="crm-details-section"
      >
        <h2 id={opportunityTitleId} className="crm-details-section-title">
          Oportunidade
        </h2>
        {cycle.leadId ? (
          <a
            className="crm-details-lead-card"
            href={`#/crm?surface=leads&leadId=${encodeURIComponent(cycle.leadId)}`}
          >
            <div className="crm-details-lead-icon">
              <Car className="size-5 text-emerald-500" />
            </div>
            <div className="crm-details-lead-body min-w-0 flex-1">
              <small>Lead vinculado</small>
              <strong>{cycle.vehicle?.title ?? "Abrir oportunidade"}</strong>
            </div>
            <ArrowUpRight className="size-4 text-muted shrink-0" />
          </a>
        ) : (
          <div className="crm-details-empty-card">
            <p>Nenhuma oportunidade vinculada a esta conversa.</p>
          </div>
        )}
      </section>

      {/* Rota da Conversa Card */}
      <section aria-labelledby={routeTitleId} className="crm-details-section">
        <h2 id={routeTitleId} className="crm-details-section-title">
          Rota da conversa
        </h2>
        <div className="crm-details-card">
          <DetailRow
            icon={<MessageCircle className="size-3.5 text-emerald-500" />}
            label="Canal"
            value={
              <span className="crm-details-badge crm-details-badge-emerald">
                {readCrmChannelLabel(cycle.channel)}
              </span>
            }
          />
          <DetailRow
            icon={<Radio className="size-3.5 text-muted" />}
            label="Transporte"
            value={readTransportLabel(cycle.connection?.provider)}
          />
          <DetailRow label="Broker" value={broker ?? "Direto"} />
          <DetailRow
            label="Conexão"
            value={cycle.connection?.displayName ?? "WhatsApp padrão"}
          />
        </div>
      </section>

      <CrmWhatsappAdAttribution metadata={cycle.metadata} />

      {/* Marcadores / Tags */}
      {cycle.tags?.length ? (
        <section aria-labelledby={tagsTitleId} className="crm-details-section">
          <h2 id={tagsTitleId} className="crm-details-section-title">
            Marcadores
          </h2>
          <div className="crm-details-tags-wrap">
            {cycle.tags.map((tag) => (
              <span
                className="crm-cycle-tag-chip"
                key={tag.id}
                style={{
                  backgroundColor: tag.color ? `${tag.color}18` : undefined,
                  color: "var(--color-text)",
                  borderColor: tag.color ? `${tag.color}40` : undefined,
                }}
              >
                {tag.emoji ? (
                  <span className="text-xs mr-0.5">{tag.emoji}</span>
                ) : (
                  <i
                    aria-hidden="true"
                    style={{
                      backgroundColor: tag.color ?? "var(--color-muted)",
                    }}
                  />
                )}
                {tag.name}
              </span>
            ))}
          </div>
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
  value?: ReactNode | string | null;
}) {
  return (
    <div
      className="crm-details-row"
      data-emphasis={emphasis ? "action" : undefined}
    >
      <dt className="crm-details-dt">
        {icon ? (
          <span aria-hidden="true" className="shrink-0">
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
      </dt>
      <dd className="crm-details-dd">{value || "-"}</dd>
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
      label: `${count} ${count === 1 ? "não lida" : "não lidas"}`,
      requiresAction: true,
    };
  }
  return { label: "Sem pendências imediatas", requiresAction: false };
}

function readTransportLabel(provider?: string | null) {
  switch (provider) {
    case "meta_cloud":
      return "Meta Cloud API";
    case "olx":
    case "olx_chat":
      return "OLX Chat";
    case "zapi":
      return "Z-API";
    case null:
    case undefined:
    default:
      return "Meta Cloud API";
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
  if (status === "COMPLETED") return "Concluída";
  if (status === "EXPIRED") return "Expirada";
  return "Ativa";
}
