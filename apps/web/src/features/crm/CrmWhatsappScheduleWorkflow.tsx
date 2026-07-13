import { CalendarClock, MessageSquareText, Send } from "lucide-react";
import { CrmSelect } from "./CrmFormControls";
import {
  CrmWhatsappWorkflowFooter,
  CrmWhatsappWorkflowPanel,
  CrmWhatsappWorkflowStepper,
} from "./CrmWhatsappWorkflow";
import {
  formatScheduleDateTime,
  isFutureScheduleValue,
  readMinScheduleDateTime,
} from "./crmWhatsappScheduleDates";
import { formatSessionName } from "./crmWhatsappModel";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

const scheduleSteps = [
  { description: "Quem recebera", label: "Conversa" },
  { description: "Momento do envio", label: "Data e hora" },
  { description: "Conteudo final", label: "Mensagem e revisao" },
] as const;

export function CrmWhatsappScheduleWorkflow({
  currentStep,
  error,
  isSaving,
  onBack,
  onCancel,
  onNext,
  onScheduledAtChange,
  onStepChange,
  onTargetSessionChange,
  onTextChange,
  scheduledAt,
  sessions,
  targetSessionId,
  text,
}: {
  currentStep: number;
  error: string | null;
  isSaving: boolean;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  onScheduledAtChange: (value: string) => void;
  onStepChange: (step: number) => void;
  onTargetSessionChange: (value: string) => void;
  onTextChange: (value: string) => void;
  scheduledAt: string;
  sessions: CrmWhatsappSession[];
  targetSessionId: string;
  text: string;
}) {
  const targetSession = sessions.find(
    (session) => String(session.id) === targetSessionId,
  );
  const isLastStep = currentStep === scheduleSteps.length - 1;
  const nextDisabled =
    currentStep === 0
      ? !targetSession
      : currentStep === 1
        ? !isFutureScheduleValue(scheduledAt)
        : !text.trim();

  return (
    <div className="crm-whatsapp-workflow crm-whatsapp-schedule-workflow">
      <CrmWhatsappWorkflowStepper
        currentStep={currentStep}
        onStepChange={onStepChange}
        steps={scheduleSteps}
      />
      {currentStep === 0 ? (
        <ConversationStep
          onChange={onTargetSessionChange}
          sessions={sessions}
          value={targetSessionId}
        />
      ) : null}
      {currentStep === 1 ? (
        <DateTimeStep
          onChange={onScheduledAtChange}
          session={targetSession}
          value={scheduledAt}
        />
      ) : null}
      {currentStep === 2 ? (
        <MessageReviewStep
          onChange={onTextChange}
          scheduledAt={scheduledAt}
          session={targetSession}
          text={text}
        />
      ) : null}
      {error ? (
        <p className="crm-whatsapp-schedule-error" role="alert">
          {error}
        </p>
      ) : null}
      <CrmWhatsappWorkflowFooter
        backDisabled={currentStep === 0}
        confirmIcon={<Send aria-hidden="true" />}
        confirmLabel="Agendar mensagem"
        isBusy={isSaving}
        isLastStep={isLastStep}
        nextDisabled={nextDisabled}
        onBack={onBack}
        onCancel={onCancel}
        onNext={onNext}
      />
    </div>
  );
}

function ConversationStep({
  onChange,
  sessions,
  value,
}: {
  onChange: (value: string) => void;
  sessions: CrmWhatsappSession[];
  value: string;
}) {
  return (
    <CrmWhatsappWorkflowPanel
      description="Selecione o atendimento que recebera a mensagem programada."
      title="Escolha a conversa"
    >
      <label className="crm-whatsapp-schedule-field">
        Conversa
        <CrmSelect
          ariaLabel="Conversa"
          className="crm-whatsapp-select"
          onChange={onChange}
          options={createSessionOptions(sessions)}
          value={value}
        />
      </label>
      {value ? (
        <div className="crm-whatsapp-schedule-selection">
          <MessageSquareText aria-hidden="true" />
          <span>
            <strong>{sessionName(sessions, value)}</strong>
            <small>Conversa selecionada para o envio</small>
          </span>
        </div>
      ) : null}
    </CrmWhatsappWorkflowPanel>
  );
}

function DateTimeStep({
  onChange,
  session,
  value,
}: {
  onChange: (value: string) => void;
  session: CrmWhatsappSession | undefined;
  value: string;
}) {
  return (
    <CrmWhatsappWorkflowPanel
      description={`Programe um horario futuro para ${session ? formatSessionName(session) : "a conversa"}.`}
      title="Defina data e hora"
    >
      <label className="crm-whatsapp-schedule-field">
        Quando enviar
        <input
          min={readMinScheduleDateTime()}
          onChange={(event) => onChange(event.target.value)}
          type="datetime-local"
          value={value}
        />
      </label>
      <div className="crm-whatsapp-schedule-selection">
        <CalendarClock aria-hidden="true" />
        <span>
          <strong>
            {value
              ? formatScheduleDateTime(value)
              : "Horario ainda nao definido"}
          </strong>
          <small>O envio usa o horario local exibido acima</small>
        </span>
      </div>
    </CrmWhatsappWorkflowPanel>
  );
}

function MessageReviewStep({
  onChange,
  scheduledAt,
  session,
  text,
}: {
  onChange: (value: string) => void;
  scheduledAt: string;
  session: CrmWhatsappSession | undefined;
  text: string;
}) {
  return (
    <CrmWhatsappWorkflowPanel
      description="Confira destinatario, horario e conteudo antes de confirmar."
      title="Mensagem e revisao"
    >
      <label className="crm-whatsapp-schedule-field">
        Mensagem
        <textarea
          maxLength={4000}
          onChange={(event) => onChange(event.target.value)}
          rows={6}
          value={text}
        />
      </label>
      <section
        aria-label="Previa do agendamento"
        className="crm-whatsapp-schedule-review"
      >
        <div>
          <strong>{session ? formatSessionName(session) : "Conversa"}</strong>
          <span>{formatScheduleDateTime(scheduledAt)}</span>
        </div>
        <p>{text.trim() || "Sua mensagem aparecera aqui."}</p>
      </section>
    </CrmWhatsappWorkflowPanel>
  );
}

function createSessionOptions(sessions: CrmWhatsappSession[]) {
  return [
    { label: "Selecione uma conversa", value: "" },
    ...sessions.map((session) => ({
      label: formatSessionName(session),
      value: String(session.id),
    })),
  ];
}

function sessionName(sessions: CrmWhatsappSession[], id: string) {
  const session = sessions.find((item) => String(item.id) === id);
  return session ? formatSessionName(session) : "Conversa indisponivel";
}
