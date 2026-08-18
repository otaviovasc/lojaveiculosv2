import { CalendarClock, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CrmActionDialogShell } from "./CrmActionDialogFrame";
import { ScheduleList } from "./CrmScheduleMessageList";
import { readMinDateTimeLocal } from "./crmDateTimeLocal";
import type { CrmScheduledMessage } from "./crmConversationTypes";

export function CrmScheduleMessageDialog({
  canCancel,
  canCreate,
  canProcess,
  canRead,
  disabled,
  embedded = false,
  onCancel,
  onClose,
  onList,
  onProcessDue,
  onSchedule,
}: {
  canCancel: boolean;
  canCreate: boolean;
  canProcess: boolean;
  canRead: boolean;
  disabled?: boolean;
  embedded?: boolean;
  onCancel: (scheduledMessageId: string) => Promise<boolean>;
  onClose: () => void;
  onList: () => Promise<CrmScheduledMessage[]>;
  onProcessDue: () => Promise<boolean>;
  onSchedule: (input: {
    scheduledAt: string;
    content: string;
  }) => Promise<boolean>;
}) {
  const [messages, setMessages] = useState<CrmScheduledMessage[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [content, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const canSave =
    canCreate &&
    Boolean(scheduledAt && content.trim()) &&
    !isSaving &&
    !disabled;
  const pendingCount = useMemo(
    () => messages.filter((message) => message.status === "pending").length,
    [messages],
  );

  const loadMessages = useCallback(async () => {
    if (!canRead) return;
    setIsLoading(true);
    setLocalError(null);
    try {
      setMessages(await onList());
    } finally {
      setIsLoading(false);
    }
  }, [canRead, onList]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

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
        content: content.trim(),
      });
      if (!accepted) {
        setLocalError("Nao foi possivel agendar a mensagem.");
        return;
      }
      setScheduledAt("");
      setText("");
      if (canRead) await loadMessages();
      else onClose();
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
      if (accepted) await loadMessages();
      else setLocalError("Nao foi possivel cancelar o agendamento.");
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

  const panelContent = (
    <>
      <header>
        <span>
          <CalendarClock />
        </span>
        <h2>Agendamentos</h2>
        {embedded ? null : (
          <button
            aria-label="Fechar"
            className="crm-icon-action"
            onClick={onClose}
            type="button"
          >
            <X />
          </button>
        )}
      </header>
      <div className="crm-action-fields">
        {canCreate ? (
          <div className="crm-schedule-form">
            <label>
              Quando enviar
              <input
                disabled={disabled || isSaving}
                min={readMinDateTimeLocal()}
                onChange={(event) => setScheduledAt(event.target.value)}
                type="datetime-local"
                value={scheduledAt}
              />
            </label>
            <label>
              Mensagem
              <textarea
                disabled={disabled || isSaving}
                maxLength={4000}
                onChange={(event) => setText(event.target.value)}
                rows={4}
                value={content}
              />
            </label>
            <button
              className="crm-action"
              disabled={!canSave}
              onClick={() => void save()}
              type="button"
            >
              Agendar mensagem
            </button>
          </div>
        ) : null}
        <div className="crm-schedule-toolbar">
          <strong>{pendingCount} pendente(s)</strong>
          {canRead ? (
            <button
              className="crm-action crm-action-muted"
              disabled={isLoading}
              onClick={() => void loadMessages()}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Atualizar
            </button>
          ) : null}
          {canProcess ? (
            <button
              className="crm-action crm-action-muted"
              disabled={isProcessing}
              onClick={() => void processDue()}
              type="button"
            >
              {isProcessing ? (
                <Loader2 aria-hidden="true" className="size-4" />
              ) : null}
              Processar vencidas
            </button>
          ) : null}
        </div>
        {localError ? <p className="crm-schedule-error">{localError}</p> : null}
        {canRead ? (
          <ScheduleList
            canCancel={canCancel}
            cancellingId={cancellingId}
            isLoading={isLoading}
            messages={messages}
            onCancel={cancel}
          />
        ) : (
          <p className="crm-schedule-empty">
            Sem permissao para listar agendamentos.
          </p>
        )}
      </div>
      {embedded ? null : (
        <footer>
          <button
            className="crm-action crm-action-muted"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </footer>
      )}
    </>
  );

  if (!embedded) {
    return (
      <CrmActionDialogShell
        onClose={onClose}
        panelClassName="crm-schedule-dialog"
        title="Agendamentos WhatsApp"
      >
        {panelContent}
      </CrmActionDialogShell>
    );
  }

  return (
    <div
      aria-label="Agendamentos WhatsApp"
      className="crm-action-dialog crm-action-embedded"
      role="region"
    >
      <div className="crm-action-panel crm-schedule-dialog">{panelContent}</div>
    </div>
  );
}
