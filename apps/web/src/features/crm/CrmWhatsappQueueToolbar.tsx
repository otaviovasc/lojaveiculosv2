import {
  Check,
  CheckSquare,
  Headset,
  Hourglass,
  Plus,
  Search,
  Tags,
  Wrench,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  QueueQuickFilterRow,
  QueueTagFilterMenu,
} from "./CrmWhatsappQueueToolbarParts";
import { CrmWhatsappConnectionFilter } from "./CrmWhatsappConnectionFilter";
import type {
  CrmWhatsappAssignableMember,
  CrmWhatsappHumanAttendanceState,
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
  onHumanAttendanceFilterChange,
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
  humanAttendanceFilter,
  quickFilter,
  search,
  selectedTagIds,
  selectedCount,
  selectionMode,
  sessionCounts,
  sessionCount,
  statusFilter,
  startConversationUnavailableReason,
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
  onHumanAttendanceFilterChange: (
    state: CrmWhatsappHumanAttendanceState | "",
  ) => void;
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
  humanAttendanceFilter: CrmWhatsappHumanAttendanceState | "";
  quickFilter: CrmWhatsappSessionFilter;
  search: string;
  selectedTagIds: string[];
  selectedCount: number;
  selectionMode: boolean;
  sessionCounts: CrmWhatsappSessionCounts;
  sessionCount: number;
  statusFilter: CrmWhatsappStatus | "";
  startConversationUnavailableReason?: string | null;
  unreadOnly: boolean;
}) {
  return (
    <header className="crm-whatsapp-toolbar">
      <div className="crm-whatsapp-toolbar-top">
        <div className="min-w-0">
          <h2>CRM</h2>
          <p>{sessionCount} conversas</p>
        </div>
        <div className="crm-whatsapp-toolbar-actions">
          <CrmWhatsappConnectionFilter
            connectionFilterId={connectionFilterId}
            connections={connections}
            fallbackConnectionId={connectionId}
            onChange={onConnectionFilterChange}
          />
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
            aria-label="Gerenciar conexões de mensagens"
            className="crm-icon-action"
            disabled={!canManageConnections}
            onClick={onManageConnections}
            title="Gerenciar conexões de mensagens"
            type="button"
          >
            <Wrench />
          </button>
        </div>
      </div>
      <div
        className="crm-whatsapp-smart-filters"
        aria-label="Filtros inteligentes"
        role="group"
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
        <button
          aria-pressed={humanAttendanceFilter === "WAITING_HUMAN"}
          className={
            humanAttendanceFilter === "WAITING_HUMAN"
              ? "crm-whatsapp-smart-filter crm-whatsapp-smart-filter-waiting-human crm-whatsapp-smart-filter-active"
              : "crm-whatsapp-smart-filter crm-whatsapp-smart-filter-waiting-human"
          }
          onClick={() =>
            onHumanAttendanceFilterChange(
              humanAttendanceFilter === "WAITING_HUMAN" ? "" : "WAITING_HUMAN",
            )
          }
          type="button"
        >
          <Hourglass aria-hidden="true" />
          Aguardando Humano
          {sessionCounts.waitingHuman > 0 ? (
            <span>{sessionCounts.waitingHuman}</span>
          ) : null}
        </button>
        <button
          aria-pressed={humanAttendanceFilter === "IN_HUMAN_SERVICE"}
          className={
            humanAttendanceFilter === "IN_HUMAN_SERVICE"
              ? "crm-whatsapp-smart-filter crm-whatsapp-smart-filter-in-human-service crm-whatsapp-smart-filter-active"
              : "crm-whatsapp-smart-filter crm-whatsapp-smart-filter-in-human-service"
          }
          onClick={() =>
            onHumanAttendanceFilterChange(
              humanAttendanceFilter === "IN_HUMAN_SERVICE"
                ? ""
                : "IN_HUMAN_SERVICE",
            )
          }
          type="button"
        >
          <Headset aria-hidden="true" />
          Em atendimento Humano
          {sessionCounts.inHumanService > 0 ? (
            <span>{sessionCounts.inHumanService}</span>
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
      </div>
      <div className="crm-whatsapp-search-row">
        <label className="crm-whatsapp-search">
          <Search aria-hidden="true" className="size-4" />
          <input
            aria-label="Pesquisar conversas por nome ou telefone"
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
          title={startConversationUnavailableReason ?? "Nova conversa"}
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
