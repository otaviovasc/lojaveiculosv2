import {
  Check,
  CheckSquare,
  Plug,
  Plus,
  Search,
  Tags,
  Wrench,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { CrmSelect } from "./CrmFormControls";
import {
  QueueQuickFilterRow,
  QueueTagFilterMenu,
} from "./CrmWhatsappQueueToolbarParts";
import type {
  CrmWhatsappAssignableMember,
  CrmWhatsappProviderConnection,
  CrmWhatsappSessionCounts,
  CrmWhatsappSessionFilter,
  CrmWhatsappStatus,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

export function WhatsappToolbar({
  assignableMembers,
  availableTags,
  children,
  canManageConnections,
  canManageTags,
  connectionId,
  connectionFilterId,
  connections,
  currentUserId,
  onConnectionFilterChange,
  onManageConnections,
  onManageTags,
  onOtherAssigneeChange,
  onQuickFilterChange,
  onSearch,
  onSelectionModeChange,
  onStartConversation,
  onStatusFilterChange,
  onTagFilterToggle,
  onUnreadOnlyChange,
  otherAssigneeId,
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
  assignableMembers: CrmWhatsappAssignableMember[];
  availableTags: CrmWhatsappTag[];
  children?: ReactNode;
  canManageConnections: boolean;
  canManageTags: boolean;
  canStartConversation: boolean;
  connectionId: string | number | null;
  connectionFilterId: string | null;
  connections: CrmWhatsappProviderConnection[];
  currentUserId: string | null;
  onConnectionFilterChange: (connectionId: string | null) => void;
  onManageConnections: () => void;
  onManageTags: () => void;
  onOtherAssigneeChange: (assigneeId: string | null) => void;
  onQuickFilterChange: (filter: CrmWhatsappSessionFilter) => void;
  onSearch: (value: string) => void;
  onSelectionModeChange: (enabled: boolean) => void;
  onStartConversation: () => void;
  onStatusFilterChange: (status: CrmWhatsappStatus | "") => void;
  onTagFilterToggle: (tagId: string) => void;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
  otherAssigneeId: string | null;
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
            aria-label="Gerenciar conexão ZAPI"
            className="crm-icon-action"
            disabled={!canManageConnections}
            onClick={onManageConnections}
            title="Gerenciar conexão ZAPI"
            type="button"
          >
            <Wrench />
          </button>
        </div>
      </div>
      <div
        className="crm-whatsapp-smart-filters"
        aria-label="Filtros da conversa"
      >
        <button
          aria-pressed={unreadOnly}
          className={
            unreadOnly
              ? "crm-whatsapp-smart-filter crm-whatsapp-smart-filter-unread crm-whatsapp-smart-filter-active"
              : "crm-whatsapp-smart-filter crm-whatsapp-smart-filter-unread"
          }
          onClick={() => onUnreadOnlyChange(!unreadOnly)}
          type="button"
        >
          <i aria-hidden="true" />
          Não lidas
          {sessionCounts.unread > 0 ? (
            <span>{sessionCounts.unread}</span>
          ) : null}
        </button>
        <QueueTagFilterMenu
          availableTags={availableTags}
          onTagFilterToggle={onTagFilterToggle}
          selectedTagIds={selectedTagIds}
        />
        <button
          aria-pressed={statusFilter === "COMPLETED"}
          className={
            statusFilter === "COMPLETED"
              ? "crm-whatsapp-smart-filter crm-whatsapp-smart-filter-active"
              : "crm-whatsapp-smart-filter"
          }
          onClick={() =>
            onStatusFilterChange(
              statusFilter === "COMPLETED" ? "" : "COMPLETED",
            )
          }
          type="button"
        >
          <Check aria-hidden="true" />
          Concluídos
          {sessionCounts.statuses.COMPLETED > 0 ? (
            <span>{sessionCounts.statuses.COMPLETED}</span>
          ) : null}
        </button>
        {connections.length > 1 ? (
          <label className="crm-whatsapp-queue-field">
            <Plug aria-hidden="true" />
            <CrmSelect
              ariaLabel="Filtrar por conexão"
              className="crm-whatsapp-select crm-whatsapp-queue-select"
              onChange={(value) => onConnectionFilterChange(value || null)}
              options={connections.map((connection) => ({
                label: connection.displayName,
                value: String(connection.id),
              }))}
              value={connectionValue}
            />
          </label>
        ) : null}
      </div>
      <div className="crm-whatsapp-search-row">
        <label className="crm-whatsapp-search">
          <Search aria-hidden="true" className="size-4" />
          <input
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Pesquisar por nome ou telefone..."
            value={search}
          />
        </label>
        <button
          aria-label={
            selectionMode ? "Cancelar seleção" : "Selecionar conversas"
          }
          aria-pressed={selectionMode}
          className={
            selectionMode
              ? "crm-icon-action crm-whatsapp-selection-action crm-whatsapp-selection-action-active"
              : "crm-icon-action crm-whatsapp-selection-action"
          }
          onClick={() => onSelectionModeChange(!selectionMode)}
          title={selectionMode ? "Cancelar seleção" : "Selecionar conversas"}
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
          <Plus aria-hidden="true" />
        </button>
      </div>
      {children}
      <QueueQuickFilterRow
        assignableMembers={assignableMembers}
        currentUserId={currentUserId}
        onOtherAssigneeChange={onOtherAssigneeChange}
        onQuickFilterChange={onQuickFilterChange}
        otherAssigneeId={otherAssigneeId}
        quickFilter={quickFilter}
        sessionCounts={sessionCounts}
      />
    </header>
  );
}
