import { CalendarClock, Loader2, Plus, RefreshCw } from "lucide-react";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { CrmSelect } from "./CrmFormControls";
import { CrmWhatsappModeBar } from "./CrmWhatsappWorkflow";
import { formatSessionName } from "./crmWhatsappModel";
import type {
  CrmWhatsappScheduledMessage,
  CrmWhatsappScheduledMessageStatus,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

export type ScheduleStatusFilter = CrmWhatsappScheduledMessageStatus | "all";
export type ScheduleStatusCounts = Record<ScheduleStatusFilter, number>;

const statusOptions: Array<{ label: string; value: ScheduleStatusFilter }> = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Enviando", value: "sending" },
  { label: "Enviadas", value: "sent" },
  { label: "Falhas", value: "failed" },
  { label: "Canceladas", value: "cancelled" },
];

export function createScheduleStatusCounts(
  messages: CrmWhatsappScheduledMessage[],
): ScheduleStatusCounts {
  const counts: ScheduleStatusCounts = {
    all: messages.length,
    cancelled: 0,
    failed: 0,
    pending: 0,
    sending: 0,
    sent: 0,
  };
  for (const message of messages) counts[message.status] += 1;
  return counts;
}

export function SchedulePageModeBar({
  canCreate,
  currentStep,
  mode,
  onCreate,
  pendingCount,
  failedCount,
}: {
  canCreate: boolean;
  currentStep: number;
  failedCount: number;
  mode: "create" | "queue";
  onCreate: () => void;
  pendingCount: number;
}) {
  return (
    <CrmWhatsappModeBar
      actions={
        mode === "queue" ? (
          <button
            className="crm-action"
            disabled={!canCreate}
            onClick={onCreate}
            type="button"
          >
            <Plus aria-hidden="true" />
            Novo agendamento
          </button>
        ) : null
      }
      summary={
        mode === "queue"
          ? `${pendingCount} pendente(s) - ${failedCount} falha(s)`
          : `Etapa ${currentStep + 1} de 3`
      }
    >
      <span className="crm-whatsapp-schedule-mode-title">
        <CalendarClock aria-hidden="true" />
        <strong>
          {mode === "queue" ? "Agenda de mensagens" : "Novo agendamento"}
        </strong>
      </span>
    </CrmWhatsappModeBar>
  );
}

export function ScheduleToolbar({
  activeSession,
  canProcess,
  canRead,
  isLoading,
  isProcessing,
  onProcessDue,
  onRefresh,
  onSessionFilterChange,
  onStatusFilterChange,
  sessionFilter,
  sessions,
  statusCounts,
  statusFilter,
}: {
  activeSession: CrmWhatsappSession | null;
  canProcess: boolean;
  canRead: boolean;
  isLoading: boolean;
  isProcessing: boolean;
  onProcessDue: () => void;
  onRefresh: () => void;
  onSessionFilterChange: (value: string) => void;
  onStatusFilterChange: (value: ScheduleStatusFilter) => void;
  sessionFilter: string;
  sessions: CrmWhatsappSession[];
  statusCounts: ScheduleStatusCounts;
  statusFilter: ScheduleStatusFilter;
}) {
  return (
    <div className="crm-whatsapp-schedule-toolbar">
      <FeatureTabs
        activeClassName="crm-whatsapp-schedule-tab-active"
        ariaLabel="Filtrar agendamentos por status"
        className="crm-whatsapp-schedule-tabs"
        onChange={onStatusFilterChange}
        optionClassName="crm-whatsapp-schedule-tab"
        options={statusOptions.map((option) => ({
          label: (
            <>
              {option.label}
              <small>{statusCounts[option.value] ?? 0}</small>
            </>
          ),
          value: option.value,
        }))}
        value={statusFilter}
      />
      <div className="crm-whatsapp-schedule-toolbar-controls">
        <CrmSelect
          ariaLabel="Filtrar agendamentos por conversa"
          className="crm-whatsapp-select"
          disabled={!canRead || isLoading}
          onChange={onSessionFilterChange}
          options={filterSessionOptions(sessions, activeSession)}
          value={sessionFilter}
        />
        {canRead ? (
          <button
            aria-label="Atualizar agendamentos"
            className="crm-icon-action"
            disabled={isLoading}
            onClick={onRefresh}
            title="Atualizar agendamentos"
            type="button"
          >
            <RefreshCw aria-hidden="true" />
          </button>
        ) : null}
        {canProcess ? (
          <button
            className="crm-action crm-action-muted"
            disabled={isProcessing}
            onClick={onProcessDue}
            type="button"
          >
            {isProcessing ? <Loader2 aria-hidden="true" /> : null}
            Processar vencidas
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatScheduleSessionLabel(session: CrmWhatsappSession) {
  const lead = session.leadId ? ` - lead ${session.leadId}` : "";
  return `${formatSessionName(session)}${lead}`;
}

function filterSessionOptions(
  sessions: CrmWhatsappSession[],
  activeSession: CrmWhatsappSession | null,
) {
  return [
    { label: "Todas as conversas", value: "all" },
    ...(activeSession
      ? [{ label: "Conversa ativa", value: String(activeSession.id) }]
      : []),
    ...sessions
      .filter(
        (session) =>
          !activeSession || String(session.id) !== String(activeSession.id),
      )
      .map((session) => ({
        label: formatScheduleSessionLabel(session),
        value: String(session.id),
      })),
  ];
}
