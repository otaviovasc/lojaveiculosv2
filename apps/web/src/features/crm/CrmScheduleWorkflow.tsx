import { CalendarClock, MessageSquareText, Send } from "lucide-react";
import { CrmSelect } from "./CrmFormControls";
import {
  CrmWorkflowFooter,
  CrmWorkflowPanel,
  CrmWorkflowStepper,
} from "./CrmWorkflow";
import {
  formatScheduleDateTime,
  isFutureScheduleValue,
  readMinScheduleDateTime,
} from "./crmScheduleDates";
import { formatCycleName } from "./crmConversationModel";
import type { CrmConversationCycle } from "./crmConversationTypes";

const scheduleSteps = [
  { description: "Quem recebera", label: "Conversa" },
  { description: "Momento do envio", label: "Data e hora" },
  { description: "Conteudo final", label: "Mensagem e revisao" },
] as const;

export function CrmScheduleWorkflow({
  currentStep,
  error,
  isSaving,
  onBack,
  onCancel,
  onNext,
  onScheduledAtChange,
  onStepChange,
  onTargetCycleChange,
  onTextChange,
  scheduledAt,
  conversationCycles,
  targetCycleId,
  content,
}: {
  currentStep: number;
  error: string | null;
  isSaving: boolean;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  onScheduledAtChange: (value: string) => void;
  onStepChange: (step: number) => void;
  onTargetCycleChange: (value: string) => void;
  onTextChange: (value: string) => void;
  scheduledAt: string;
  conversationCycles: CrmConversationCycle[];
  targetCycleId: string;
  content: string;
}) {
  const targetCycle = conversationCycles.find(
    (cycle) => String(cycle.id) === targetCycleId,
  );
  const isLastStep = currentStep === scheduleSteps.length - 1;
  const nextDisabled =
    currentStep === 0
      ? !targetCycle
      : currentStep === 1
        ? !isFutureScheduleValue(scheduledAt)
        : !content.trim();

  return (
    <div className="crm-workflow crm-schedule-workflow">
      <CrmWorkflowStepper
        currentStep={currentStep}
        onStepChange={onStepChange}
        steps={scheduleSteps}
      />
      {currentStep === 0 ? (
        <ConversationStep
          onChange={onTargetCycleChange}
          conversationCycles={conversationCycles}
          value={targetCycleId}
        />
      ) : null}
      {currentStep === 1 ? (
        <DateTimeStep
          onChange={onScheduledAtChange}
          cycle={targetCycle}
          value={scheduledAt}
        />
      ) : null}
      {currentStep === 2 ? (
        <MessageReviewStep
          onChange={onTextChange}
          scheduledAt={scheduledAt}
          cycle={targetCycle}
          content={content}
        />
      ) : null}
      {error ? (
        <p className="crm-schedule-error" role="alert">
          {error}
        </p>
      ) : null}
      <CrmWorkflowFooter
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
  conversationCycles,
  value,
}: {
  onChange: (value: string) => void;
  conversationCycles: CrmConversationCycle[];
  value: string;
}) {
  return (
    <CrmWorkflowPanel
      description="Selecione o atendimento que recebera a mensagem programada."
      title="Escolha a conversa"
    >
      <label className="crm-schedule-field">
        Conversa
        <CrmSelect
          ariaLabel="Conversa"
          className="crm-select"
          onChange={onChange}
          options={createSessionOptions(conversationCycles)}
          value={value}
        />
      </label>
      {value ? (
        <div className="crm-schedule-selection">
          <MessageSquareText aria-hidden="true" />
          <span>
            <strong>{sessionName(conversationCycles, value)}</strong>
            <small>Conversa selecionada para o envio</small>
          </span>
        </div>
      ) : null}
    </CrmWorkflowPanel>
  );
}

function DateTimeStep({
  onChange,
  cycle,
  value,
}: {
  onChange: (value: string) => void;
  cycle: CrmConversationCycle | undefined;
  value: string;
}) {
  return (
    <CrmWorkflowPanel
      description={`Programe um horario futuro para ${cycle ? formatCycleName(cycle) : "a conversa"}.`}
      title="Defina data e hora"
    >
      <label className="crm-schedule-field">
        Quando enviar
        <input
          min={readMinScheduleDateTime()}
          onChange={(event) => onChange(event.target.value)}
          type="datetime-local"
          value={value}
        />
      </label>
      <div className="crm-schedule-selection">
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
    </CrmWorkflowPanel>
  );
}

function MessageReviewStep({
  onChange,
  scheduledAt,
  cycle,
  content,
}: {
  onChange: (value: string) => void;
  scheduledAt: string;
  cycle: CrmConversationCycle | undefined;
  content: string;
}) {
  return (
    <CrmWorkflowPanel
      description="Confira destinatario, horario e conteudo antes de confirmar."
      title="Mensagem e revisao"
    >
      <label className="crm-schedule-field">
        Mensagem
        <textarea
          maxLength={4000}
          onChange={(event) => onChange(event.target.value)}
          rows={6}
          value={content}
        />
      </label>
      <section
        aria-label="Previa do agendamento"
        className="crm-schedule-review"
      >
        <div>
          <strong>{cycle ? formatCycleName(cycle) : "Conversa"}</strong>
          <span>{formatScheduleDateTime(scheduledAt)}</span>
        </div>
        <p>{content.trim() || "Sua mensagem aparecera aqui."}</p>
      </section>
    </CrmWorkflowPanel>
  );
}

function createSessionOptions(conversationCycles: CrmConversationCycle[]) {
  return [
    { label: "Selecione uma conversa", value: "" },
    ...conversationCycles.map((cycle) => ({
      label: formatCycleName(cycle),
      value: String(cycle.id),
    })),
  ];
}

function sessionName(conversationCycles: CrmConversationCycle[], id: string) {
  const cycle = conversationCycles.find((item) => String(item.id) === id);
  return cycle ? formatCycleName(cycle) : "Conversa indisponivel";
}
