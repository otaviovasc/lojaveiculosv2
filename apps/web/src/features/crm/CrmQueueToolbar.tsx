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
} from "./CrmQueueToolbarParts";
import { CrmConnectionFilter } from "./CrmConnectionFilter";
import type {
  CrmAssignableMember,
  CrmHumanAttendanceState,
  CrmProviderConnection,
  CrmConversationCycleCounts,
  CrmConversationCycleFilter,
  CrmConversationCycleStatus,
  CrmTag,
} from "./crmConversationTypes";

export function CrmQueueToolbar({
  assignableMembers,
  availableTags,
  children,
  canAssign,
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
  conversationCycleCounts,
  sessionCount,
  statusFilter,
  startConversationUnavailableReason,
  unreadOnly,
  canStartConversation,
}: {
  assignableMembers: CrmAssignableMember[];
  availableTags: CrmTag[];
  children?: ReactNode;
  canAssign: boolean;
  canManageConnections: boolean;
  canManageTags: boolean;
  canStartConversation: boolean;
  connectionId: string | number | null;
  connectionFilterId: string | null;
  connections: CrmProviderConnection[];
  currentUserId: string | null;
  onConnectionFilterChange: (connectionId: string | null) => void;
  onHumanAttendanceFilterChange: (state: CrmHumanAttendanceState | "") => void;
  onManageConnections: () => void;
  onManageTags: () => void;
  onOtherAssigneeChange: (assigneeId: string | null) => void;
  onQuickFilterChange: (filter: CrmConversationCycleFilter) => void;
  onSearch: (value: string) => void;
  onSelectionModeChange: (enabled: boolean) => void;
  onStartConversation: () => void;
  onStatusFilterChange: (status: CrmConversationCycleStatus | "") => void;
  onTagFilterToggle: (tagId: string) => void;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
  otherAssigneeId: string | null;
  humanAttendanceFilter: CrmHumanAttendanceState | "";
  quickFilter: CrmConversationCycleFilter;
  search: string;
  selectedTagIds: string[];
  selectedCount: number;
  selectionMode: boolean;
  conversationCycleCounts: CrmConversationCycleCounts;
  sessionCount: number;
  statusFilter: CrmConversationCycleStatus | "";
  startConversationUnavailableReason?: string | null;
  unreadOnly: boolean;
}) {
  return (
    <header className="crm-toolbar">
      <div className="crm-toolbar-top">
        <div className="min-w-0">
          <h2>CRM</h2>
          <p>{sessionCount} conversas</p>
        </div>
        <div className="crm-toolbar-actions">
          <CrmConnectionFilter
            connectionFilterId={connectionFilterId}
            connections={connections}
            fallbackConnectionId={connectionId}
            onChange={onConnectionFilterChange}
            onSetup={onManageConnections}
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
        className="crm-smart-filters"
        aria-label="Filtros inteligentes"
        role="group"
      >
        <button
          aria-pressed={unreadOnly}
          className={
            unreadOnly
              ? "crm-smart-filter crm-smart-filter-unread crm-smart-filter-active"
              : "crm-smart-filter crm-smart-filter-unread"
          }
          onClick={() => onUnreadOnlyChange(!unreadOnly)}
          type="button"
        >
          <i aria-hidden="true" />
          Não lidas
          {conversationCycleCounts.unread > 0 ? (
            <span>{conversationCycleCounts.unread}</span>
          ) : null}
        </button>
        <button
          aria-pressed={humanAttendanceFilter === "WAITING_HUMAN"}
          className={
            humanAttendanceFilter === "WAITING_HUMAN"
              ? "crm-smart-filter crm-smart-filter-waiting-human crm-smart-filter-active"
              : "crm-smart-filter crm-smart-filter-waiting-human"
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
          {conversationCycleCounts.waitingHuman > 0 ? (
            <span>{conversationCycleCounts.waitingHuman}</span>
          ) : null}
        </button>
        <button
          aria-pressed={humanAttendanceFilter === "IN_HUMAN_SERVICE"}
          className={
            humanAttendanceFilter === "IN_HUMAN_SERVICE"
              ? "crm-smart-filter crm-smart-filter-in-human-service crm-smart-filter-active"
              : "crm-smart-filter crm-smart-filter-in-human-service"
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
          {conversationCycleCounts.inHumanService > 0 ? (
            <span>{conversationCycleCounts.inHumanService}</span>
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
              ? "crm-smart-filter crm-smart-filter-active"
              : "crm-smart-filter"
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
          {conversationCycleCounts.statuses.COMPLETED > 0 ? (
            <span>{conversationCycleCounts.statuses.COMPLETED}</span>
          ) : null}
        </button>
      </div>
      <div className="crm-search-row">
        <label className="crm-search">
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
              ? "crm-icon-action crm-selection-action crm-selection-action-active"
              : "crm-icon-action crm-selection-action"
          }
          onClick={() => onSelectionModeChange(!selectionMode)}
          title={selectionMode ? "Cancelar seleção" : "Selecionar conversas"}
          type="button"
        >
          {selectionMode ? <X /> : <CheckSquare />}
          {selectedCount > 0 ? (
            <span className="crm-selection-badge">{selectedCount}</span>
          ) : null}
        </button>
        <button
          aria-label="Nova conversa"
          className="crm-icon-action crm-new-cycle-action"
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
        canAssign={canAssign}
        currentUserId={currentUserId}
        onOtherAssigneeChange={onOtherAssigneeChange}
        onQuickFilterChange={onQuickFilterChange}
        otherAssigneeId={otherAssigneeId}
        quickFilter={quickFilter}
        conversationCycleCounts={conversationCycleCounts}
      />
    </header>
  );
}
