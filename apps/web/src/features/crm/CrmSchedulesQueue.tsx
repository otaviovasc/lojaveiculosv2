import {
  countSchedulesByView,
  ScheduleBoard,
  type ScheduleStatusCounts,
  type ScheduleStatusFilter,
  type ScheduleView,
} from "./CrmSchedulesPageParts";
import type {
  CrmConversationCycle,
  CrmScheduledMessage,
} from "./crmConversationTypes";

export function CrmSchedulesQueue({
  canCancel,
  canProcess,
  canRead,
  cancellingId,
  confirmingCancelId,
  conversationCycles,
  error,
  isLoading,
  isProcessing,
  messages,
  onCancel,
  onCancelRequest,
  onDismissCancel,
  onProcessDue,
  onSessionFilterChange,
  onStatusFilterChange,
  sessionFilter,
  statusFilter,
  successMessage,
}: {
  activeSession: CrmConversationCycle | null;
  canCancel: boolean;
  canProcess: boolean;
  canRead: boolean;
  cancellingId: string | null;
  confirmingCancelId: string | null;
  conversationCycles: CrmConversationCycle[];
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
  statusCounts: ScheduleStatusCounts;
  statusFilter: ScheduleStatusFilter;
  successMessage: string | null;
}) {
  return (
    <div
      aria-label="Agenda de mensagens"
      className="crm-schedule-queue-wrapper"
    >
      <ScheduleBoard
        activeView={scheduleViewFromStatus(statusFilter)}
        canCancel={canCancel}
        canEdit={false}
        canProcess={canProcess}
        canRead={canRead}
        cancellingId={cancellingId}
        confirmingCancelId={confirmingCancelId}
        conversationCycles={conversationCycles}
        error={error}
        isLoading={isLoading}
        isProcessing={isProcessing}
        messages={messages}
        onCancel={onCancel}
        onCancelRequest={onCancelRequest}
        onDismissCancel={onDismissCancel}
        onEdit={() => undefined}
        onProcessDue={onProcessDue}
        onSessionFilterChange={onSessionFilterChange}
        onViewChange={(view) => {
          if (view === "today" || view === "tomorrow" || view === "upcoming")
            return;
          onStatusFilterChange(view === "pending" ? "pending" : view);
        }}
        sessionFilter={sessionFilter}
        successMessage={successMessage}
        viewCounts={countSchedulesByView(messages)}
      />
    </div>
  );
}

function scheduleViewFromStatus(status: ScheduleStatusFilter): ScheduleView {
  if (status === "sending") return "pending";
  return status;
}
