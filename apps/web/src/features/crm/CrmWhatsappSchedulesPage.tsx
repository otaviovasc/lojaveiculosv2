import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { ScheduleList } from "./CrmWhatsappScheduleMessageList";
import {
  createScheduleStatusCounts,
  ScheduleCreateForm,
  ScheduleToolbar,
  type ScheduleStatusFilter,
} from "./CrmWhatsappSchedulesPageParts";
import type {
  CrmWhatsappListScheduledMessagesInput,
  CrmWhatsappScheduledMessage,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

export function CrmWhatsappSchedulesPage({
  activeSession,
  canCancel,
  canCreate,
  canProcess,
  canRead,
  connectionId,
  error,
  onCancel,
  onList,
  onProcessDue,
  onSchedule,
  sessions,
}: {
  activeSession: CrmWhatsappSession | null;
  canCancel: boolean;
  canCreate: boolean;
  canProcess: boolean;
  canRead: boolean;
  connectionId: string | null;
  error: Error | null;
  onCancel: (scheduledMessageId: string) => Promise<boolean>;
  onList: (
    input?: CrmWhatsappListScheduledMessagesInput,
  ) => Promise<CrmWhatsappScheduledMessage[]>;
  onProcessDue: () => Promise<boolean>;
  onSchedule: (input: {
    scheduledAt: string;
    sessionId: string;
    text: string;
  }) => Promise<boolean>;
  sessions: CrmWhatsappSession[];
}) {
  const [messages, setMessages] = useState<CrmWhatsappScheduledMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [targetSessionId, setTargetSessionId] = useState(
    activeSession ? String(activeSession.id) : "",
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(
    null,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (activeSession) setTargetSessionId(String(activeSession.id));
  }, [activeSession]);

  const query = useMemo<CrmWhatsappListScheduledMessagesInput>(() => {
    const input: CrmWhatsappListScheduledMessagesInput = { limit: 100 };
    if (connectionId) input.connectionId = connectionId;
    if (sessionFilter !== "all") input.sessionId = sessionFilter;
    return input;
  }, [connectionId, sessionFilter]);

  const loadMessages = useCallback(async () => {
    if (!canRead) return;
    setIsLoading(true);
    setLocalError(null);
    try {
      setMessages(await onList(query));
    } finally {
      setIsLoading(false);
    }
  }, [canRead, onList, query]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const pendingCount = messages.filter(
    (message) => message.status === "pending",
  ).length;
  const statusCounts = useMemo(
    () => createScheduleStatusCounts(messages),
    [messages],
  );
  const visibleMessages = useMemo(
    () =>
      statusFilter === "all"
        ? messages
        : messages.filter((message) => message.status === statusFilter),
    [messages, statusFilter],
  );
  const canSave = Boolean(
    canCreate && targetSessionId && scheduledAt && text.trim() && !isSaving,
  );

  const save = async () => {
    if (!canSave) return;
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime()) || when <= new Date()) {
      setLocalError("Escolha uma data futura.");
      return;
    }
    setIsSaving(true);
    setLocalError(null);
    try {
      const accepted = await onSchedule({
        scheduledAt: when.toISOString(),
        sessionId: targetSessionId,
        text: text.trim(),
      });
      if (!accepted) {
        setLocalError("Nao foi possivel agendar a mensagem.");
        return;
      }
      setScheduledAt("");
      setText("");
      await loadMessages();
    } finally {
      setIsSaving(false);
    }
  };

  const cancel = async (scheduledMessageId: string) => {
    if (!canCancel || cancellingId) return;
    setCancellingId(scheduledMessageId);
    setLocalError(null);
    try {
      const accepted = await onCancel(scheduledMessageId);
      if (accepted) {
        setConfirmingCancelId(null);
        await loadMessages();
      } else setLocalError("Nao foi possivel cancelar o agendamento.");
    } finally {
      setCancellingId(null);
    }
  };

  const processDue = async () => {
    if (!canProcess || isProcessing) return;
    setIsProcessing(true);
    setLocalError(null);
    try {
      const accepted = await onProcessDue();
      if (accepted) await loadMessages();
      else
        setLocalError("Nao foi possivel processar os agendamentos vencidos.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="crm-whatsapp-section">
      <header className="crm-whatsapp-schedules-header">
        <span aria-hidden="true">
          <CalendarClock className="size-5" />
        </span>
        <div>
          <strong>Agendamentos</strong>
          <h2>Agendar mensagem</h2>
          <p>Crie e acompanhe envios futuros sem abrir uma conversa.</p>
        </div>
        <dl>
          <div>
            <dt>Pendentes</dt>
            <dd>{pendingCount}</dd>
          </div>
          <div>
            <dt>Falhas</dt>
            <dd>{statusCounts.failed}</dd>
          </div>
        </dl>
      </header>
      <div className="crm-whatsapp-schedules-page">
        <ScheduleCreateForm
          canCreate={canCreate}
          canSave={canSave}
          isSaving={isSaving}
          onSave={() => void save()}
          onScheduledAtChange={setScheduledAt}
          onTargetSessionChange={setTargetSessionId}
          onTextChange={setText}
          scheduledAt={scheduledAt}
          sessions={sessions}
          targetSessionId={targetSessionId}
          text={text}
        />
        <section className="crm-whatsapp-schedule-results" aria-label="Lista">
          <ScheduleToolbar
            activeSession={activeSession}
            canProcess={canProcess}
            canRead={canRead}
            isLoading={isLoading}
            isProcessing={isProcessing}
            onProcessDue={() => void processDue()}
            onRefresh={() => void loadMessages()}
            onSessionFilterChange={setSessionFilter}
            onStatusFilterChange={setStatusFilter}
            sessionFilter={sessionFilter}
            sessions={sessions}
            statusCounts={statusCounts}
            statusFilter={statusFilter}
          />
          {localError ? (
            <p className="crm-whatsapp-schedule-error">{localError}</p>
          ) : null}
          {error ? (
            <p className="crm-whatsapp-schedule-error">{error.message}</p>
          ) : null}
          {canRead ? (
            <ScheduleList
              canCancel={canCancel}
              cancellingId={cancellingId}
              confirmingCancelId={confirmingCancelId}
              emptyLabel="Nenhum agendamento encontrado para os filtros."
              isLoading={isLoading}
              messages={visibleMessages}
              onCancel={cancel}
              onCancelRequest={setConfirmingCancelId}
              onDismissCancel={() => setConfirmingCancelId(null)}
              sessions={sessions}
            />
          ) : (
            <p className="crm-whatsapp-schedule-empty">
              Sem permissao para listar agendamentos.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
