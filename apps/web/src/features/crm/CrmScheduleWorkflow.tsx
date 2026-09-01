import {
  CalendarClock,
  CheckCheck,
  Clock,
  MessageSquareText,
  Phone,
  Send,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
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
import { CRM_SCHEDULE_MESSAGE_TEMPLATES } from "./crmScheduleTemplates";

export const scheduleWorkflowSteps = [
  { description: "Quem receberá", label: "Conversa" },
  { description: "Momento do envio", label: "Data e hora" },
  { description: "Conteúdo final", label: "Mensagem e revisão" },
] as const;

const QUICK_TIME_SLOTS = [
  "08:30",
  "09:00",
  "10:00",
  "11:30",
  "14:00",
  "15:30",
  "17:00",
  "18:30",
];

export function CrmScheduleWorkflow({
  content,
  conversationCycles,
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
  targetCycleId,
}: {
  content: string;
  conversationCycles: CrmConversationCycle[];
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
  targetCycleId: string;
}) {
  const targetCycle = conversationCycles.find(
    (cycle) => String(cycle.id) === targetCycleId,
  );
  const isLastStep = currentStep === scheduleWorkflowSteps.length - 1;
  const nextDisabled =
    currentStep === 0
      ? !targetCycle
      : currentStep === 1
        ? !isFutureScheduleValue(scheduledAt)
        : !content.trim();

  return (
    <div className="crm-workflow crm-workflow--connection crm-schedule-workflow">
      <CrmWorkflowStepper
        currentStep={currentStep}
        onStepChange={onStepChange}
        steps={scheduleWorkflowSteps}
      />
      <div className="crm-visit-workflow-main">
        {error ? (
          <p className="crm-schedule-error" role="alert">
            {error}
          </p>
        ) : null}

        {currentStep === 0 ? (
          <ConversationStep
            conversationCycles={conversationCycles}
            onChange={onTargetCycleChange}
            targetCycle={targetCycle}
            value={targetCycleId}
          />
        ) : null}

        {currentStep === 1 ? (
          <DateTimeStep
            cycle={targetCycle}
            onChange={onScheduledAtChange}
            value={scheduledAt}
          />
        ) : null}

        {currentStep === 2 ? (
          <MessageReviewStep
            content={content}
            cycle={targetCycle}
            onChange={onTextChange}
            scheduledAt={scheduledAt}
          />
        ) : null}
      </div>

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
  conversationCycles,
  onChange,
  targetCycle,
  value,
}: {
  conversationCycles: CrmConversationCycle[];
  onChange: (value: string) => void;
  targetCycle: CrmConversationCycle | undefined;
  value: string;
}) {
  return (
    <CrmWorkflowPanel
      description="Selecione o atendimento e cliente que receberá a mensagem programada."
      icon={<MessageSquareText />}
      title="Escolha a conversa"
    >
      <div className="crm-schedule-step-layout">
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

        {targetCycle ? (
          <div className="crm-visit-contact">
            <span>
              <User aria-hidden="true" />
            </span>
            <div>
              <strong>{formatCycleName(targetCycle)}</strong>
              <small>
                {targetCycle.customerPhone || "Sem telefone informado"}
                {targetCycle.leadId ? ` · Lead #${targetCycle.leadId}` : ""}
              </small>
            </div>
            {targetCycle.leadId ? (
              <div className="crm-visit-contact-links">
                <a
                  href={`#/crm?surface=leads&leadId=${targetCycle.leadId}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <User aria-hidden="true" />
                  Abrir ficha do lead
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="crm-visit-create-empty">
            <MessageSquareText aria-hidden="true" />
            <strong>Nenhum atendimento selecionado</strong>
            <p>
              Escolha uma conversa ativa acima para programar o envio da
              mensagem.
            </p>
          </div>
        )}
      </div>
    </CrmWorkflowPanel>
  );
}

function DateTimeStep({
  cycle,
  onChange,
  value,
}: {
  cycle: CrmConversationCycle | undefined;
  onChange: (value: string) => void;
  value: string;
}) {
  const setQuickPreset = (hoursFromNow: number, targetHour?: number) => {
    const d = new Date();
    if (targetHour !== undefined) {
      d.setDate(d.getDate() + hoursFromNow);
      d.setHours(targetHour, 0, 0, 0);
    } else {
      d.setHours(d.getHours() + hoursFromNow);
    }
    const offset = d.getTimezoneOffset();
    const adjusted = new Date(d.getTime() - offset * 60_000);
    onChange(adjusted.toISOString().slice(0, 16));
  };

  const setTimeSlot = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    let base = value ? new Date(value) : new Date();
    if (Number.isNaN(base.getTime()) || base <= new Date()) {
      base = new Date();
      base.setDate(base.getDate() + 1);
    }
    base.setHours(hours ?? 10, minutes ?? 0, 0, 0);
    const offset = base.getTimezoneOffset();
    const adjusted = new Date(base.getTime() - offset * 60_000);
    onChange(adjusted.toISOString().slice(0, 16));
  };

  return (
    <CrmWorkflowPanel
      description={`Programe a data e o horário para o envio automático para ${
        cycle ? formatCycleName(cycle) : "o cliente"
      }.`}
      icon={<CalendarClock />}
      title="Defina data e hora"
    >
      <div className="crm-visit-step-two-layout">
        <div className="crm-visit-section-card">
          <div className="crm-visit-section-header">
            <span className="crm-visit-section-icon">
              <CalendarClock aria-hidden="true" />
            </span>
            <div>
              <h3>Quando enviar</h3>
              <p>Escolha o momento exato do envio programado</p>
            </div>
          </div>

          <label className="crm-schedule-field">
            Data e Hora
            <input
              aria-label="Quando enviar"
              min={readMinScheduleDateTime()}
              onChange={(event) => onChange(event.target.value)}
              type="datetime-local"
              value={value}
            />
          </label>

          <div className="crm-visit-quick-group">
            <span className="crm-visit-quick-group-label">
              <Zap aria-hidden="true" />
              Atalhos Rápidos
            </span>
            <div className="crm-visit-quick-preset-pills">
              <button
                className="crm-visit-preset-btn"
                onClick={() => setQuickPreset(0, 14)}
                type="button"
              >
                Hoje 14:00
              </button>
              <button
                className="crm-visit-preset-btn"
                onClick={() => setQuickPreset(0, 17)}
                type="button"
              >
                Hoje 17:00
              </button>
              <button
                className="crm-visit-preset-btn"
                onClick={() => setQuickPreset(1, 9)}
                type="button"
              >
                Amanhã 09:00
              </button>
              <button
                className="crm-visit-preset-btn"
                onClick={() => setQuickPreset(1, 14)}
                type="button"
              >
                Amanhã 14:00
              </button>
              <button
                className="crm-visit-preset-btn"
                onClick={() => setQuickPreset(2, 10)}
                type="button"
              >
                Em 2 dias
              </button>
            </div>
          </div>

          <div className="crm-visit-time-slots">
            <span className="crm-visit-time-slots-label">
              Horários frequentes
            </span>
            <div className="crm-visit-time-slot-pills">
              {QUICK_TIME_SLOTS.map((slot) => (
                <button
                  className="crm-visit-time-slot-btn"
                  key={slot}
                  onClick={() => setTimeSlot(slot)}
                  type="button"
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="crm-visit-section-card">
          <div className="crm-visit-section-header">
            <span className="crm-visit-section-icon">
              <Clock aria-hidden="true" />
            </span>
            <div>
              <h3>Resumo do Horário</h3>
              <p>Confira a programação no fuso local</p>
            </div>
          </div>

          <div className="crm-schedule-selection">
            <CalendarClock aria-hidden="true" />
            <span>
              <strong>
                {value
                  ? formatScheduleDateTime(value)
                  : "Horário ainda não definido"}
              </strong>
              <small>
                {value && isFutureScheduleValue(value)
                  ? "Programação válida para disparo automático"
                  : "Selecione uma data e hora futura"}
              </small>
            </span>
          </div>

          {cycle ? (
            <div className="crm-visit-contact">
              <span>
                <Phone aria-hidden="true" />
              </span>
              <div>
                <strong>{formatCycleName(cycle)}</strong>
                <small>{cycle.customerPhone ?? "Destinatário"}</small>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </CrmWorkflowPanel>
  );
}

function MessageReviewStep({
  content,
  cycle,
  onChange,
  scheduledAt,
}: {
  content: string;
  cycle: CrmConversationCycle | undefined;
  onChange: (value: string) => void;
  scheduledAt: string;
}) {
  const recipientName = cycle
    ? formatCycleName(cycle)
    : "Destinatário do WhatsApp";
  const charCount = content.length;

  return (
    <CrmWorkflowPanel
      description="Escreva o texto da mensagem e visualize a prévia em tempo real antes de agendar."
      icon={<Send />}
      title="Mensagem e revisão"
    >
      <div className="crm-visit-step-two-layout">
        {/* Editor Card */}
        <div className="crm-visit-section-card">
          <div className="crm-visit-section-header">
            <span className="crm-visit-section-icon">
              <Sparkles aria-hidden="true" />
            </span>
            <div>
              <h3>Conteúdo da Mensagem</h3>
              <p>Digite ou escolha um modelo rápido</p>
            </div>
          </div>

          <div className="crm-visit-quick-group">
            <span className="crm-visit-quick-group-label">
              <Zap aria-hidden="true" />
              Modelos Rápidos
            </span>
            <div className="crm-visit-quick-preset-pills">
              {CRM_SCHEDULE_MESSAGE_TEMPLATES.map((tpl) => (
                <button
                  className="crm-visit-preset-btn"
                  key={tpl.label}
                  onClick={() => onChange(tpl.text)}
                  type="button"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <label className="crm-schedule-field">
            <div className="flex justify-between items-center">
              <span>Mensagem</span>
              <span className="text-xs text-muted font-mono">
                {charCount} / 4000
              </span>
            </div>
            <textarea
              aria-label="Mensagem"
              maxLength={4000}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Digite sua mensagem programada aqui..."
              rows={6}
              value={content}
            />
          </label>
        </div>

        {/* Live Preview Card */}
        <div className="crm-visit-section-card">
          <div className="crm-visit-section-header">
            <span className="crm-visit-section-icon">
              <MessageSquareText aria-hidden="true" />
            </span>
            <div>
              <h3>Prévia do Envio</h3>
              <p>Visualização de como o cliente receberá no WhatsApp</p>
            </div>
          </div>

          <section
            aria-label="Previa do agendamento"
            className="crm-schedule-review-card"
          >
            <div className="crm-schedule-review-header">
              <div>
                <strong>{recipientName}</strong>
                <span>{formatScheduleDateTime(scheduledAt)}</span>
              </div>
            </div>

            <div className="crm-schedule-whatsapp-bubble">
              <p>{content.trim() || "Sua mensagem aparecerá aqui."}</p>
              <div className="crm-schedule-whatsapp-time">
                <span>
                  {scheduledAt
                    ? new Date(scheduledAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </span>
                <CheckCheck aria-hidden="true" />
              </div>
            </div>
          </section>
        </div>
      </div>
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
