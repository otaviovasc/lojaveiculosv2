import { ScheduleList } from "./CrmWhatsappScheduleMessageList";
import {
  ScheduleToolbar,
  type ScheduleStatusCounts,
  type ScheduleStatusFilter,
} from "./CrmWhatsappSchedulesPageParts";
import type {
  CrmWhatsappScheduledMessage,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

export function CrmWhatsappSchedulesQueue({
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
  sessions,
  statusCounts,
  statusFilter,
  successMessage,
}: {
  activeSession: CrmWhatsappSession | null;
  canCancel: boolean;
  canProcess: boolean;
  canRead: boolean;
  cancellingId: string | null;
  confirmingCancelId: string | null;
  error: string | null;
  isLoading: boolean;
  isProcessing: boolean;
  messages: CrmWhatsappScheduledMessage[];
  onCancel: (scheduledMessageId: string) => Promise<void>;
  onCancelRequest: (scheduledMessageId: string) => void;
  onDismissCancel: () => void;
  onProcessDue: () => void;
  onRefresh: () => void;
  onSessionFilterChange: (value: string) => void;
  onStatusFilterChange: (value: ScheduleStatusFilter) => void;
  sessionFilter: string;
  sessions: CrmWhatsappSession[];
  statusCounts: ScheduleStatusCounts;
  statusFilter: ScheduleStatusFilter;
  successMessage: string | null;
}) {
  return (
    <section
      aria-label="Agenda de mensagens"
      className="crm-whatsapp-schedule-queue"
    >
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
        sessions={sessions}
        statusCounts={statusCounts}
        statusFilter={statusFilter}
      />
      {successMessage ? (
        <p className="crm-whatsapp-schedule-success" role="status">
          {successMessage}
        </p>
      ) : null}
      {error ? (
        <p className="crm-whatsapp-schedule-error" role="alert">
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
          sessions={sessions}
        />
      ) : (
        <p className="crm-whatsapp-schedule-empty">
          Sem permissao para listar agendamentos.
        </p>
      )}
    </section>
  );
}
