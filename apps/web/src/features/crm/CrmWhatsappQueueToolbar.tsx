import {
  CheckSquare,
  Inbox,
  MailOpen,
  MessageSquarePlus,
  Plug,
  Search,
  SlidersHorizontal,
  Tags,
  Wrench,
  X,
} from "lucide-react";
import { whatsappStatusOptions } from "./crmWhatsappQueueState";
import {
  QueueMetric,
  QueueQuickFilterRow,
  QueueTagFilterRow,
} from "./CrmWhatsappQueueToolbarParts";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappSessionCounts,
  CrmWhatsappSessionFilter,
  CrmWhatsappStatus,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

export function WhatsappToolbar({
  availableTags,
  canManageConnections,
  canManageTags,
  connectionId,
  connectionFilterId,
  connections,
  onConnectionFilterChange,
  onManageConnections,
  onManageTags,
  onQuickFilterChange,
  onSearch,
  onSelectionModeChange,
  onStartConversation,
  onStatusFilterChange,
  onTagFilterToggle,
  onUnreadOnlyChange,
  quickFilter,
  search,
  selectedTagIds,
  selectedCount,
  selectionMode,
  sessionCounts,
  sessionCount,
  statusFilter,
  statusLabel,
  statusTone,
  unreadOnly,
  canStartConversation,
}: {
  availableTags: CrmWhatsappTag[];
  canManageConnections: boolean;
  canManageTags: boolean;
  canStartConversation: boolean;
  connectionId: string | number | null;
  connectionFilterId: string | null;
  connections: CrmWhatsappProviderConnection[];
  onConnectionFilterChange: (connectionId: string | null) => void;
  onManageConnections: () => void;
  onManageTags: () => void;
  onQuickFilterChange: (filter: CrmWhatsappSessionFilter) => void;
  onSearch: (value: string) => void;
  onSelectionModeChange: (enabled: boolean) => void;
  onStartConversation: () => void;
  onStatusFilterChange: (status: CrmWhatsappStatus | "") => void;
  onTagFilterToggle: (tagId: string) => void;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
  quickFilter: CrmWhatsappSessionFilter;
  search: string;
  selectedTagIds: string[];
  selectedCount: number;
  selectionMode: boolean;
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
          <h2>CRM</h2>
          <p>{sessionCount} conversas</p>
        </div>
        <div className="crm-whatsapp-toolbar-actions">
          <span
            className={`crm-whatsapp-status crm-whatsapp-status-${statusTone}`}
          >
            <span aria-hidden="true" />
            {statusLabel}
          </span>
          <button
            aria-label={
              selectionMode ? "Cancelar selecao" : "Selecionar conversas"
            }
            aria-pressed={selectionMode}
            className={
              selectionMode
                ? "crm-icon-action crm-icon-action-active"
                : "crm-icon-action"
            }
            onClick={() => onSelectionModeChange(!selectionMode)}
            title={selectionMode ? "Cancelar selecao" : "Selecionar conversas"}
            type="button"
          >
            {selectionMode ? <X /> : <CheckSquare />}
            {selectedCount > 0 ? (
              <span className="crm-whatsapp-selection-badge">
                {selectedCount}
              </span>
            ) : null}
          </button>
          <button
            aria-label="Nova conversa"
            className="crm-icon-action crm-whatsapp-new-session-action"
            disabled={!canStartConversation}
            onClick={onStartConversation}
            title="Nova conversa"
            type="button"
          >
            <MessageSquarePlus aria-hidden="true" className="size-4" />
          </button>
          <button
            aria-label="Gerenciar etiquetas"
            className="crm-icon-action"
            disabled={!canManageTags}
            onClick={onManageTags}
            title="Gerenciar etiquetas"
            type="button"
          >
            <Tags />
          </button>
          <button
            aria-label="Gerenciar conexao ZAPI"
            className="crm-icon-action"
            disabled={!canManageConnections}
            onClick={onManageConnections}
            title="Gerenciar conexao ZAPI"
            type="button"
          >
            <Wrench />
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
      <QueueQuickFilterRow
        onQuickFilterChange={onQuickFilterChange}
        quickFilter={quickFilter}
        sessionCounts={sessionCounts}
      />
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
      <QueueTagFilterRow
        availableTags={availableTags}
        onTagFilterToggle={onTagFilterToggle}
        selectedTagIds={selectedTagIds}
      />
    </header>
  );
}
