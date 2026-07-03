import {
  Inbox,
  MailOpen,
  MessageSquarePlus,
  Plug,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { ReactNode } from "react";
import { countForFilter, whatsappStatusOptions } from "./crmWhatsappQueueState";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappSessionCounts,
  CrmWhatsappSessionFilter,
  CrmWhatsappStatus,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

const QUICK_FILTER_OPTIONS: Array<{
  label: string;
  value: CrmWhatsappSessionFilter;
}> = [
  { label: "Novos", value: "fresh" },
  { label: "Sem atendente", value: "unassigned" },
  { label: "Meus", value: "mine" },
  { label: "Outros", value: "others" },
  { label: "Todos", value: "all" },
];

export function WhatsappToolbar({
  availableTags,
  connectionId,
  connectionFilterId,
  connections,
  onConnectionFilterChange,
  onQuickFilterChange,
  onSearch,
  onStartConversation,
  onStatusFilterChange,
  onTagFilterToggle,
  onUnreadOnlyChange,
  quickFilter,
  search,
  selectedTagIds,
  sessionCounts,
  sessionCount,
  statusFilter,
  statusLabel,
  statusTone,
  unreadOnly,
  canStartConversation,
}: {
  availableTags: CrmWhatsappTag[];
  canStartConversation: boolean;
  connectionId: string | number | null;
  connectionFilterId: string | null;
  connections: CrmWhatsappProviderConnection[];
  onConnectionFilterChange: (connectionId: string | null) => void;
  onQuickFilterChange: (filter: CrmWhatsappSessionFilter) => void;
  onSearch: (value: string) => void;
  onStartConversation: () => void;
  onStatusFilterChange: (status: CrmWhatsappStatus | "") => void;
  onTagFilterToggle: (tagId: string) => void;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
  quickFilter: CrmWhatsappSessionFilter;
  search: string;
  selectedTagIds: string[];
  sessionCounts: CrmWhatsappSessionCounts;
  sessionCount: number;
  statusFilter: CrmWhatsappStatus | "";
  statusLabel: string;
  statusTone: "error" | "loading" | "neutral" | "offline" | "online";
  unreadOnly: boolean;
}) {
  const connectionValue = String(connectionFilterId ?? connectionId ?? "");
  return (
    <header className="crm-whatsapp-toolbar">
      <div className="crm-whatsapp-toolbar-top">
        <div className="min-w-0">
          <h2>Conversas</h2>
          <p>{sessionCount} nesta lista</p>
        </div>
        <div className="crm-whatsapp-toolbar-actions">
          <span
            className={`crm-whatsapp-status crm-whatsapp-status-${statusTone}`}
          >
            <span aria-hidden="true" />
            {statusLabel}
          </span>
          <button
            className="crm-action"
            disabled={!canStartConversation}
            onClick={onStartConversation}
            type="button"
          >
            <MessageSquarePlus aria-hidden="true" className="size-4" />
            Nova
          </button>
        </div>
      </div>
      <div className="crm-whatsapp-queue-summary">
        <QueueMetric
          icon={<Inbox />}
          label="Total"
          value={sessionCounts.total}
        />
        <QueueMetric
          icon={<MailOpen />}
          label="Nao lidas"
          value={sessionCounts.unread}
        />
      </div>
      <label className="crm-whatsapp-search">
        <Search aria-hidden="true" className="size-4" />
        <input
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar por contato, telefone ou mensagem"
          value={search}
        />
      </label>
      <div className="crm-whatsapp-filter-row" aria-label="Filtro rapido">
        {QUICK_FILTER_OPTIONS.map((option) => (
          <button
            aria-pressed={quickFilter === option.value}
            className={
              quickFilter === option.value
                ? "crm-whatsapp-filter crm-whatsapp-filter-active"
                : "crm-whatsapp-filter"
            }
            key={option.value}
            onClick={() => onQuickFilterChange(option.value)}
            type="button"
          >
            {option.label}
            <span>{countForFilter(sessionCounts, option.value)}</span>
          </button>
        ))}
      </div>
      <div className="crm-whatsapp-queue-controls" aria-label="Filtros de fila">
        <button
          aria-pressed={unreadOnly}
          className={
            unreadOnly
              ? "crm-whatsapp-filter crm-whatsapp-filter-active"
              : "crm-whatsapp-filter"
          }
          onClick={() => onUnreadOnlyChange(!unreadOnly)}
          type="button"
        >
          Nao lidas
          <span>{sessionCounts.unread}</span>
        </button>
        <label className="crm-whatsapp-queue-field">
          <SlidersHorizontal aria-hidden="true" />
          <select
            aria-label="Filtrar por status"
            className="crm-whatsapp-select crm-whatsapp-queue-select"
            onChange={(event) =>
              onStatusFilterChange(event.target.value as CrmWhatsappStatus | "")
            }
            value={statusFilter}
          >
            {whatsappStatusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
                {option.value
                  ? ` (${sessionCounts.statuses[option.value]})`
                  : ""}
              </option>
            ))}
          </select>
        </label>
        {connections.length > 1 ? (
          <label className="crm-whatsapp-queue-field">
            <Plug aria-hidden="true" />
            <select
              aria-label="Filtrar por conexao"
              className="crm-whatsapp-select crm-whatsapp-queue-select"
              onChange={(event) =>
                onConnectionFilterChange(event.target.value || null)
              }
              value={connectionValue}
            >
              {connections.map((connection) => (
                <option key={connection.id} value={String(connection.id)}>
                  {connection.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {availableTags.length ? (
        <div
          className="crm-whatsapp-tag-filter-row"
          aria-label="Filtrar por etiquetas"
        >
          {availableTags.slice(0, 8).map((tag) => (
            <button
              aria-pressed={selectedTagIds.includes(tag.id)}
              key={tag.id}
              onClick={() => onTagFilterToggle(tag.id)}
              type="button"
            >
              <i
                aria-hidden="true"
                style={{ backgroundColor: tag.color ?? "var(--color-muted)" }}
              />
              {tag.name}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}

function QueueMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <span className="crm-whatsapp-queue-metric">
      {icon}
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}
