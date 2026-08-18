import { ScheduleList } from "./CrmScheduleMessageList";
import {
  ScheduleToolbar,
  type ScheduleStatusCounts,
  type ScheduleStatusFilter,
} from "./CrmSchedulesPageParts";
import type {
  CrmScheduledMessage,
  CrmConversationCycle,
} from "./crmConversationTypes";

export function CrmSchedulesQueue({
  activeSession,
  canCancel,
  canProcess,
  canRead,
  cancellingId,
  confirmingCancelId,
  error,
  isLoading,
  isProcessing,
  messages,
  onCancel,
  onCancelRequest,
  onDismissCancel,
  onProcessDue,
  onRefresh,
  onSessionFilterChange,
  onStatusFilterChange,
  sessionFilter,
  conversationCycles,
  statusCounts,
  statusFilter,
  successMessage,
}: {
  activeSession: CrmConversationCycle | null;
  canCancel: boolean;
  canProcess: boolean;
  canRead: boolean;
  cancellingId: string | null;
  confirmingCancelId: string | null;
  error: string | null;
  isLoading: boolean;
  isProcessing: boolean;
  messages: CrmScheduledMessage[];
  onCancel: (scheduledMessageId: string) => Promise<void>;
  onCancelRequest: (scheduledMessageId: string) => void;
  onDismissCancel: () => void;
  onProcessDue: () => void;
  onRefresh: () => void;
  onSessionFilterChange: (value: string) => void;
  onStatusFilterChange: (value: ScheduleStatusFilter) => void;
  sessionFilter: string;
  conversationCycles: CrmConversationCycle[];
  statusCounts: ScheduleStatusCounts;
  statusFilter: ScheduleStatusFilter;
  successMessage: string | null;
}) {
  return (
    <section aria-label="Agenda de mensagens" className="crm-schedule-queue">
      <ScheduleToolbar
        activeSession={activeSession}
        canProcess={canProcess}
        canRead={canRead}
        isLoading={isLoading}
        isProcessing={isProcessing}
        onProcessDue={onProcessDue}
        onRefresh={onRefresh}
        onSessionFilterChange={onSessionFilterChange}
        onStatusFilterChange={onStatusFilterChange}
        sessionFilter={sessionFilter}
        conversationCycles={conversationCycles}
        statusCounts={statusCounts}
        statusFilter={statusFilter}
      />
      {successMessage ? (
        <p className="crm-schedule-success" role="status">
          {successMessage}
        </p>
      ) : null}
      {error ? (
        <p className="crm-schedule-error" role="alert">
          {error}
        </p>
      ) : null}
      {canRead ? (
        <ScheduleList
          canCancel={canCancel}
          cancellingId={cancellingId}
          confirmingCancelId={confirmingCancelId}
          emptyLabel="Nenhum agendamento encontrado para os filtros."
          isLoading={isLoading}
          messages={messages}
          onCancel={onCancel}
          onCancelRequest={onCancelRequest}
          onDismissCancel={onDismissCancel}
          conversationCycles={conversationCycles}
        />
      ) : (
        <p className="crm-schedule-empty">
          Sem permissao para listar agendamentos.
        </p>
      )}
    </section>
  );
}
