import { CalendarClock, Loader2, Plus, RefreshCw } from "lucide-react";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { CrmSelect } from "./CrmFormControls";
import { CrmModeBar } from "./CrmWorkflow";
import { formatCycleName } from "./crmConversationModel";
import type {
  CrmScheduledMessage,
  CrmScheduledMessageStatus,
  CrmConversationCycle,
} from "./crmConversationTypes";

export type ScheduleStatusFilter = CrmScheduledMessageStatus | "all";
export type ScheduleStatusCounts = Record<ScheduleStatusFilter, number>;

const statusOptions: Array<{ label: string; value: ScheduleStatusFilter }> = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Enviando", value: "sending" },
  { label: "Enviadas", value: "sent" },
  { label: "Falhas", value: "failed" },
  { label: "Canceladas", value: "cancelled" },
];

const scheduleStepSummaries = [
  "Escolha a conversa",
  "Defina data e hora",
  "Revise a mensagem",
] as const;

export function createScheduleStatusCounts(
  messages: CrmScheduledMessage[],
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
    <CrmModeBar
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
          : `Etapa ${currentStep + 1} de ${scheduleStepSummaries.length} · ${scheduleStepSummaries[currentStep] ?? "Revise a mensagem"}`
      }
    >
      <span className="crm-schedule-mode-title">
        <CalendarClock aria-hidden="true" />
        <span>
          <strong>
            {mode === "queue" ? "Agenda de mensagens" : "Novo agendamento"}
          </strong>
          {mode === "create" ? (
            <small>Configure destinatário, horário e mensagem.</small>
          ) : null}
        </span>
      </span>
    </CrmModeBar>
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
  conversationCycles,
  statusCounts,
  statusFilter,
}: {
  activeSession: CrmConversationCycle | null;
  canProcess: boolean;
  canRead: boolean;
  isLoading: boolean;
  isProcessing: boolean;
  onProcessDue: () => void;
  onRefresh: () => void;
  onSessionFilterChange: (value: string) => void;
  onStatusFilterChange: (value: ScheduleStatusFilter) => void;
  sessionFilter: string;
  conversationCycles: CrmConversationCycle[];
  statusCounts: ScheduleStatusCounts;
  statusFilter: ScheduleStatusFilter;
}) {
  return (
    <div className="crm-schedule-toolbar">
      <FeatureTabs
        activeClassName="crm-schedule-tab-active"
        ariaLabel="Filtrar agendamentos por status"
        className="crm-schedule-tabs"
        onChange={onStatusFilterChange}
        optionClassName="crm-schedule-tab"
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
      <div className="crm-schedule-toolbar-controls">
        <CrmSelect
          ariaLabel="Filtrar agendamentos por conversa"
          className="crm-select"
          disabled={!canRead || isLoading}
          onChange={onSessionFilterChange}
          options={filterSessionOptions(conversationCycles, activeSession)}
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

function formatScheduleSessionLabel(cycle: CrmConversationCycle) {
  const lead = cycle.leadId ? ` - lead ${cycle.leadId}` : "";
  return `${formatCycleName(cycle)}${lead}`;
}

function filterSessionOptions(
  conversationCycles: CrmConversationCycle[],
  activeSession: CrmConversationCycle | null,
) {
  return [
    { label: "Todas as conversas", value: "all" },
    ...(activeSession
      ? [{ label: "Conversa ativa", value: String(activeSession.id) }]
      : []),
    ...conversationCycles
      .filter(
        (cycle) =>
          !activeSession || String(cycle.id) !== String(activeSession.id),
      )
      .map((cycle) => ({
        label: formatScheduleSessionLabel(cycle),
        value: String(cycle.id),
      })),
  ];
}
