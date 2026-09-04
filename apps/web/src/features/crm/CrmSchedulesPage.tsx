import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Pencil } from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { formatBrazilianPhone } from "../../lib/masks";
import {
  CrmModeBar,
  CrmWorkflowFooter,
  CrmWorkflowStepper,
} from "./CrmWorkflow";
import {
  countSchedulesByView,
  ScheduleBoard,
  SchedulePageHeader,
  schedulesForView,
  type ScheduleView,
} from "./CrmSchedulesPageParts";
import {
  isScheduleDateValid,
  ScheduleCreationStep,
  scheduleCreationSteps,
} from "./CrmScheduleCreation";
import {
  isSchedulePhoneValid,
  schedulePhoneDigits,
  type ScheduleDestinationMode,
} from "./CrmScheduleRecipientStep";
import { CrmSchedulesCalendar } from "./CrmSchedulesCalendar";
import type {
  CrmListScheduledMessagesInput,
  CrmScheduledMessage,
} from "./crmConversationTypes";
import type { CrmSchedulesPageProps } from "./crmSchedulesPageTypes";

export function CrmSchedulesPage({
  activeSession,
  canCancel,
  canCreate,
  canProcess,
  canRead,
  connectionId,
  conversationCycles,
  error,
  initialMessages,
  onCancel,
  onList,
  onProcessDue,
  onSchedule,
  onUpdate,
}: CrmSchedulesPageProps) {
  const [messages, setMessages] = useState<CrmScheduledMessage[]>(
    initialMessages ?? [],
  );
  const hasMessagesDataRef = useRef(initialMessages !== undefined);
  const [activeView, setActiveView] = useState<ScheduleView>("pending");
  const [displayMode, setDisplayMode] = useState<"board" | "calendar">("board");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<"create" | "list">("list");
  const [step, setStep] = useState(0);
  const [targetCycleId, setTargetCycleId] = useState(
    activeSession ? String(activeSession.id) : "",
  );
  const [destinationMode, setDestinationMode] =
    useState<ScheduleDestinationMode>("conversation");
  const [phone, setPhone] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [content, setContent] = useState("");
  const [editingMessage, setEditingMessage] =
    useState<CrmScheduledMessage | null>(null);
  const [sessionFilter, setSessionFilter] = useState("all");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(
    null,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (activeSession && mode === "list")
      setTargetCycleId(String(activeSession.id));
  }, [activeSession, mode]);

  const query = useMemo<CrmListScheduledMessagesInput>(() => {
    const input: CrmListScheduledMessagesInput = { limit: 100 };
    if (connectionId) input.connectionId = connectionId;
    if (sessionFilter !== "all") input.cycleId = sessionFilter;
    return input;
  }, [connectionId, sessionFilter]);

  const loadMessages = useCallback(async () => {
    if (!canRead) return;
    if (!hasMessagesDataRef.current) setIsLoading(true);
    setLocalError(null);
    try {
      const nextMessages = await onList(query);
      hasMessagesDataRef.current = true;
      setMessages(nextMessages);
    } catch (caught) {
      setLocalError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível carregar agendamentos.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [canRead, onList, query]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const resetDraft = () => {
    setContent("");
    setDestinationMode("conversation");
    setEditingMessage(null);
    setPhone("");
    setScheduledAt("");
    setTargetCycleId(activeSession ? String(activeSession.id) : "");
    setStep(0);
  };

  const closeCreation = () => {
    setMode("list");
    resetDraft();
    setLocalError(null);
  };

  const startCreation = (presetDate?: Date) => {
    if (!canCreate) return;
    resetDraft();
    setMode("create");
    setSuccessMessage(null);
    setLocalError(null);
    if (presetDate) setScheduledAt(toLocalDateTimeInput(presetDate));
  };

  const startEdit = (message: CrmScheduledMessage) => {
    if (!canCreate || message.status !== "pending") return;
    const hasKnownCycle = conversationCycles.some(
      (cycle) => String(cycle.id) === String(message.cycleId),
    );
    setEditingMessage(message);
    setDestinationMode(hasKnownCycle ? "conversation" : "phone");
    setTargetCycleId(String(message.cycleId));
    setPhone(formatBrazilianPhone(message.recipientAddress ?? ""));
    setContent(message.content);
    setScheduledAt(toLocalDateTimeInput(new Date(message.scheduledAt)));
    setStep(0);
    setMode("create");
    setSuccessMessage(null);
    setLocalError(null);
  };

  const save = async () => {
    const invalidRecipient = editingMessage
      ? false
      : destinationMode === "conversation"
        ? !targetCycleId
        : !connectionId || !isSchedulePhoneValid(phone);
    if (
      !canCreate ||
      invalidRecipient ||
      !content.trim() ||
      !isScheduleDateValid(scheduledAt) ||
      isSaving
    ) {
      setLocalError(
        scheduleDraftError({
          connectionId,
          content,
          destinationMode,
          phone,
          scheduledAt,
          targetCycleId,
        }),
      );
      return;
    }

    const scheduledAtIso = new Date(scheduledAt).toISOString();
    setIsSaving(true);
    setLocalError(null);
    try {
      const accepted = editingMessage
        ? await onUpdate(editingMessage.id, {
            content: content.trim(),
            scheduledAt: scheduledAtIso,
          })
        : await onSchedule(
            destinationMode === "conversation"
              ? {
                  content: content.trim(),
                  cycleId: targetCycleId,
                  scheduledAt: scheduledAtIso,
                }
              : {
                  connectionId: connectionId!,
                  content: content.trim(),
                  phone: schedulePhoneDigits(phone),
                  scheduledAt: scheduledAtIso,
                },
          );
      if (!accepted) {
        setLocalError(
          editingMessage
            ? "Não foi possível salvar o agendamento."
            : "Não foi possível agendar a mensagem.",
        );
        return;
      }
      setSuccessMessage(
        editingMessage
          ? "Agendamento atualizado com sucesso."
          : "Mensagem agendada com sucesso.",
      );
      setMode("list");
      resetDraft();
      setActiveView("pending");
      setDisplayMode("board");
      setSessionFilter("all");
      await loadMessages();
    } catch (caught) {
      setLocalError(
        formatApiErrorDisplay(
          caught,
          editingMessage
            ? "Não foi possível salvar o agendamento."
            : "Não foi possível agendar a mensagem.",
        ),
      );
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
        setSuccessMessage("Agendamento cancelado com sucesso.");
        await loadMessages();
      } else setLocalError("Não foi possível cancelar o agendamento.");
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
        setLocalError("Não foi possível processar os agendamentos vencidos.");
    } finally {
      setIsProcessing(false);
    }
  };

  const viewCounts = countSchedulesByView(messages);
  const viewMessages = schedulesForView(messages, activeView);
  const recipientReady = editingMessage
    ? true
    : destinationMode === "conversation"
      ? Boolean(targetCycleId)
      : Boolean(connectionId) && isSchedulePhoneValid(phone);
  const nextDisabled =
    !canCreate ||
    (step === 0 && !recipientReady) ||
    (step === 1 && !isScheduleDateValid(scheduledAt)) ||
    (step === 2 && !content.trim());

  return (
    <section className="crm-section">
      <div className="crm-schedules-page crm-visits-page">
        {mode === "list" ? (
          <SchedulePageHeader
            canCreate={canCreate}
            displayMode={displayMode}
            isLoading={isLoading}
            onDisplayModeChange={setDisplayMode}
            onRefresh={() => void loadMessages()}
            onStart={() => startCreation()}
          />
        ) : (
          <CrmModeBar
            actions={null}
            summary={`Passo ${step + 1} de ${scheduleCreationSteps.length}`}
          >
            <span className="crm-mode-label">
              {editingMessage ? (
                <Pencil aria-hidden="true" />
              ) : (
                <CalendarClock aria-hidden="true" />
              )}
              {editingMessage ? "Editar agendamento" : "Novo agendamento"}
            </span>
          </CrmModeBar>
        )}

        {mode === "create" ? (
          <div className="crm-workflow crm-workflow--connection">
            <CrmWorkflowStepper
              currentStep={step}
              onStepChange={setStep}
              steps={scheduleCreationSteps}
            />
            <div className="crm-schedule-workflow-main crm-visit-workflow-main">
              {localError ? (
                <p className="crm-visits-error" role="alert">
                  {localError}
                </p>
              ) : null}
              <ScheduleCreationStep
                activeSession={activeSession}
                connectionAvailable={Boolean(connectionId)}
                content={content}
                conversationCycles={conversationCycles}
                destinationMode={destinationMode}
                isEditing={Boolean(editingMessage)}
                onContentChange={setContent}
                onDestinationModeChange={setDestinationMode}
                onPhoneChange={setPhone}
                onScheduledAtChange={setScheduledAt}
                onTargetCycleIdChange={setTargetCycleId}
                phone={phone}
                scheduledAt={scheduledAt}
                step={step}
                targetCycleId={targetCycleId}
              />
            </div>
            <CrmWorkflowFooter
              backDisabled={step === 0}
              confirmIcon={
                editingMessage ? (
                  <Pencil aria-hidden="true" />
                ) : (
                  <CalendarClock aria-hidden="true" />
                )
              }
              confirmLabel={
                editingMessage ? "Salvar alterações" : "Agendar mensagem"
              }
              isBusy={isSaving}
              isLastStep={step === scheduleCreationSteps.length - 1}
              nextDisabled={nextDisabled}
              onBack={() => setStep((current) => Math.max(0, current - 1))}
              onCancel={closeCreation}
              onNext={() =>
                step === scheduleCreationSteps.length - 1
                  ? void save()
                  : setStep((current) => current + 1)
              }
            />
          </div>
        ) : displayMode === "board" ? (
          <ScheduleBoard
            activeView={activeView}
            canCancel={canCancel}
            canEdit={canCreate}
            canProcess={canProcess}
            canRead={canRead}
            cancellingId={cancellingId}
            confirmingCancelId={confirmingCancelId}
            conversationCycles={conversationCycles}
            error={localError ?? error?.message ?? null}
            isLoading={isLoading}
            isProcessing={isProcessing}
            messages={viewMessages}
            onCancel={cancel}
            onCancelRequest={setConfirmingCancelId}
            onDismissCancel={() => setConfirmingCancelId(null)}
            onEdit={startEdit}
            onProcessDue={() => void processDue()}
            onSessionFilterChange={setSessionFilter}
            onViewChange={setActiveView}
            sessionFilter={sessionFilter}
            successMessage={successMessage}
            viewCounts={viewCounts}
          />
        ) : (
          <CrmSchedulesCalendar
            canCancel={canCancel}
            canEdit={canCreate}
            conversationCycles={conversationCycles}
            isCancelling={Boolean(cancellingId)}
            messages={messages}
            onCancel={cancel}
            onEdit={startEdit}
            onStartCreation={(date) => startCreation(date)}
          />
        )}
      </div>
    </section>
  );
}

function toLocalDateTimeInput(date: Date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function scheduleDraftError(input: {
  connectionId: string | null;
  content: string;
  destinationMode: ScheduleDestinationMode;
  phone: string;
  scheduledAt: string;
  targetCycleId: string;
}) {
  if (input.destinationMode === "conversation" && !input.targetCycleId)
    return "Escolha uma conversa para continuar.";
  if (input.destinationMode === "phone" && !input.connectionId)
    return "Conecte um WhatsApp antes de agendar para um novo número.";
  if (input.destinationMode === "phone" && !isSchedulePhoneValid(input.phone))
    return "Informe um telefone válido com DDD.";
  if (!isScheduleDateValid(input.scheduledAt))
    return "Escolha uma data futura.";
  if (!input.content.trim()) return "Escreva a mensagem que será enviada.";
  return "Revise os dados do agendamento.";
}
