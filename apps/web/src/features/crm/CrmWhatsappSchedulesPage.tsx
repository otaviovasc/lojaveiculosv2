import { useCallback, useEffect, useMemo, useState } from "react";
import { CrmWhatsappScheduleWorkflow } from "./CrmWhatsappScheduleWorkflow";
import {
  createScheduleStatusCounts,
  SchedulePageModeBar,
  type ScheduleStatusFilter,
} from "./CrmWhatsappSchedulesPageParts";
import { CrmWhatsappSchedulesQueue } from "./CrmWhatsappSchedulesQueue";
import { isFutureScheduleValue } from "./crmWhatsappScheduleDates";
import type {
  CrmWhatsappListScheduledMessagesInput,
  CrmWhatsappScheduledMessage,
} from "./crmWhatsappTypes";
import type { CrmWhatsappSchedulesPageProps } from "./crmWhatsappSchedulesPageTypes";

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
}: CrmWhatsappSchedulesPageProps) {
  const [messages, setMessages] = useState<CrmWhatsappScheduledMessage[]>([]);
  const [mode, setMode] = useState<"create" | "queue">("queue");
  const [currentStep, setCurrentStep] = useState(0);
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
  const save = async () => {
    if (
      !canCreate ||
      !targetSessionId ||
      !text.trim() ||
      !isFutureScheduleValue(scheduledAt) ||
      isSaving
    ) {
      setLocalError("Escolha uma data futura.");
      return;
    }
    const when = new Date(scheduledAt);
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
      resetCreateFlow();
      setMode("queue");
      setSessionFilter("all");
      setStatusFilter("pending");
      setSuccessMessage("Mensagem agendada com sucesso.");
      await loadMessages();
    } catch (caught) {
      setLocalError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel agendar a mensagem.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetCreateFlow = () => {
    setCurrentStep(0);
    setScheduledAt("");
    setText("");
    setTargetSessionId(activeSession ? String(activeSession.id) : "");
    setLocalError(null);
  };

  const openCreateFlow = () => {
    if (!canCreate) return;
    resetCreateFlow();
    setSuccessMessage(null);
    setMode("create");
  };

  const closeCreateFlow = () => {
    resetCreateFlow();
    setMode("queue");
  };

  const advanceCreateFlow = () => {
    setLocalError(null);
    if (currentStep < 2) setCurrentStep((step) => step + 1);
    else void save();
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
      <div className="crm-whatsapp-schedules-page">
        <SchedulePageModeBar
          canCreate={canCreate}
          currentStep={currentStep}
          failedCount={statusCounts.failed}
          mode={mode}
          onCreate={openCreateFlow}
          pendingCount={pendingCount}
        />

        {mode === "create" ? (
          <CrmWhatsappScheduleWorkflow
            currentStep={currentStep}
            error={localError ?? error?.message ?? null}
            isSaving={isSaving}
            onBack={() => setCurrentStep((step) => Math.max(0, step - 1))}
            onCancel={closeCreateFlow}
            onNext={advanceCreateFlow}
            onScheduledAtChange={setScheduledAt}
            onStepChange={(step) => {
              setLocalError(null);
              setCurrentStep(step);
            }}
            onTargetSessionChange={setTargetSessionId}
            onTextChange={setText}
            scheduledAt={scheduledAt}
            sessions={sessions}
            targetSessionId={targetSessionId}
            text={text}
          />
        ) : (
          <CrmWhatsappSchedulesQueue
            activeSession={activeSession}
            canCancel={canCancel}
            canProcess={canProcess}
            canRead={canRead}
            cancellingId={cancellingId}
            confirmingCancelId={confirmingCancelId}
            error={localError ?? error?.message ?? null}
            isLoading={isLoading}
            isProcessing={isProcessing}
            messages={visibleMessages}
            onCancel={cancel}
            onCancelRequest={setConfirmingCancelId}
            onDismissCancel={() => setConfirmingCancelId(null)}
            onProcessDue={() => void processDue()}
            onRefresh={() => void loadMessages()}
            onSessionFilterChange={setSessionFilter}
            onStatusFilterChange={setStatusFilter}
            sessionFilter={sessionFilter}
            sessions={sessions}
            statusCounts={statusCounts}
            statusFilter={statusFilter}
            successMessage={successMessage}
          />
        )}
      </div>
    </section>
  );
}
