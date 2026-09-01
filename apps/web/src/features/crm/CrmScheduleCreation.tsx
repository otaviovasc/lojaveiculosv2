import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  MessageSquare,
  Phone,
  UserRound,
  Zap,
} from "lucide-react";
import { DatePickerField } from "../../components/ui/DatePickerField";
import {
  FeatureTextarea,
  TimePickerField,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { formatCycleName } from "./crmConversationModel";
import { formatCrmPhone } from "./crmPhoneFormat";
import { CrmWorkflowPanel } from "./CrmWorkflow";
import { CrmDateTimeShortcuts } from "./CrmDateTimeShortcuts";
import {
  CrmScheduleRecipientStep,
  type ScheduleDestinationMode,
} from "./CrmScheduleRecipientStep";
import type { CrmConversationCycle } from "./crmConversationTypes";
import { CRM_SCHEDULE_MESSAGE_TEMPLATES } from "./crmScheduleTemplates";

export const scheduleCreationSteps = [
  { description: "Conversa ou novo número", label: "Destinatário" },
  { description: "Quando e detalhes", label: "Data e hora" },
  { description: "Confira antes de agendar", label: "Mensagem e revisão" },
] as const;

const schedulePresets = [
  { dayOffset: 0, h: 14, label: "Hoje às 14h", m: 0 },
  { dayOffset: 0, h: 17, label: "Hoje às 17h", m: 0 },
  { dayOffset: 1, h: 10, label: "Amanhã às 10h", m: 0 },
  { dayOffset: 1, h: 15, label: "Amanhã às 15h", m: 0 },
] as const;

export function ScheduleCreationStep({
  activeSession,
  content,
  conversationCycles,
  connectionAvailable,
  destinationMode,
  isEditing,
  onContentChange,
  onDestinationModeChange,
  onPhoneChange,
  onScheduledAtChange,
  onTargetCycleIdChange,
  phone,
  scheduledAt,
  step,
  targetCycleId,
}: {
  activeSession: CrmConversationCycle | null;
  connectionAvailable: boolean;
  content: string;
  conversationCycles: CrmConversationCycle[];
  destinationMode: ScheduleDestinationMode;
  isEditing: boolean;
  onContentChange: (value: string) => void;
  onDestinationModeChange: (value: ScheduleDestinationMode) => void;
  onPhoneChange: (value: string) => void;
  onScheduledAtChange: (value: string) => void;
  onTargetCycleIdChange: (value: string) => void;
  phone: string;
  scheduledAt: string;
  step: number;
  targetCycleId: string;
}) {
  const targetCycle = conversationCycles.find(
    (c) => String(c.id) === targetCycleId,
  );

  if (step === 0) {
    return (
      <CrmScheduleRecipientStep
        connectionAvailable={connectionAvailable}
        conversationCycles={conversationCycles}
        destinationMode={destinationMode}
        isEditing={isEditing}
        onDestinationModeChange={onDestinationModeChange}
        onPhoneChange={onPhoneChange}
        onTargetCycleIdChange={onTargetCycleIdChange}
        phone={phone}
        targetCycle={targetCycle}
        targetCycleId={targetCycleId}
      />
    );
  }

  if (step === 1) {
    const parsedDate =
      scheduledAt && !Number.isNaN(new Date(scheduledAt).getTime())
        ? new Date(scheduledAt)
        : null;

    const timeString =
      scheduledAt && scheduledAt.includes("T")
        ? (scheduledAt.split("T")[1]?.slice(0, 5) ?? "10:00")
        : "10:00";

    const handleDateChange = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const time = timeString || "10:00";
      onScheduledAtChange(`${year}-${month}-${day}T${time}`);
    };

    const handleTimeChange = (newTime: string) => {
      const datePart =
        scheduledAt && scheduledAt.includes("T")
          ? scheduledAt.split("T")[0]
          : new Date().toISOString().slice(0, 10);
      onScheduledAtChange(`${datePart}T${newTime}`);
    };

    const applyQuickTime = (
      dayOffset: number,
      hour: number,
      minute: number = 0,
    ) => {
      const target = new Date();
      target.setDate(target.getDate() + dayOffset);
      target.setHours(hour, minute, 0, 0);
      const offset = target.getTimezoneOffset();
      const adjusted = new Date(target.getTime() - offset * 60_000);
      onScheduledAtChange(adjusted.toISOString().slice(0, 16));
    };

    const applyTimeOnly = (hour: number, minute: number = 0) => {
      const base = scheduledAt ? new Date(scheduledAt) : new Date();
      if (Number.isNaN(base.getTime())) {
        base.setTime(Date.now());
      }
      base.setHours(hour, minute, 0, 0);
      const offset = base.getTimezoneOffset();
      const adjusted = new Date(base.getTime() - offset * 60_000);
      onScheduledAtChange(adjusted.toISOString().slice(0, 16));
    };

    return (
      <CrmWorkflowPanel
        description="Escolha a data e horário em que a mensagem será disparada para o cliente."
        icon={<CalendarClock />}
        title="Defina data e hora"
      >
        <div className="crm-visit-step-two-layout">
          {/* Column 1: Date & Time Section */}
          <div className="crm-visit-section-card">
            <div className="crm-visit-section-header">
              <span className="crm-visit-section-icon">
                <Calendar aria-hidden="true" />
              </span>
              <div>
                <h3>Data e Horário</h3>
                <p>Selecione quando a mensagem deve ser enviada</p>
              </div>
            </div>

            {/* Standard DatePickerField & TimePickerField */}
            <div className="crm-visit-datetime-field-group">
              <div className="crm-visit-datepicker-block">
                <span className="crm-visit-field-label">Data do envio</span>
                <DatePickerField
                  label="Data"
                  onChange={handleDateChange}
                  value={parsedDate}
                />
              </div>
              <div className="crm-visit-timepicker-block">
                <span className="crm-visit-field-label">Horário do envio</span>
                <TimePickerField
                  label="Horário"
                  onChange={handleTimeChange}
                  value={timeString}
                />
              </div>
            </div>

            <CrmDateTimeShortcuts
              activeTime={timeString}
              onApplyPreset={applyQuickTime}
              onApplyTime={applyTimeOnly}
              presets={schedulePresets}
            />

            {/* Hidden input for programmatic accessibility / tests */}
            <input
              aria-label="Quando enviar"
              className="sr-only"
              onChange={(event) => onScheduledAtChange(event.target.value)}
              tabIndex={-1}
              type="datetime-local"
              value={scheduledAt}
            />
          </div>

          {/* Column 2: Recipient Details */}
          <div className="crm-visit-section-card">
            <div className="crm-visit-section-header">
              <span className="crm-visit-section-icon">
                <UserRound aria-hidden="true" />
              </span>
              <div>
                <h3>Destinatário</h3>
                <p>Confirme os dados antes de prosseguir</p>
              </div>
            </div>

            {targetCycle || destinationMode === "phone" ? (
              <div className="crm-visit-contact">
                <span aria-hidden="true">
                  {destinationMode === "phone" ? <Phone /> : <UserRound />}
                </span>
                <div>
                  <strong>
                    {targetCycle ? formatCycleName(targetCycle) : phone}
                  </strong>
                  <small>
                    {targetCycle?.customerPhone
                      ? formatCrmPhone(targetCycle.customerPhone)
                      : "Novo número"}
                  </small>
                </div>
              </div>
            ) : null}

            <div className="crm-visit-selected-vehicle-badge">
              <Clock aria-hidden="true" />
              <span>
                Envio programado para:{" "}
                <strong>
                  {scheduledAt
                    ? formatVisitDateTime(scheduledAt)
                    : "Horário não definido"}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </CrmWorkflowPanel>
    );
  }

  return (
    <CrmWorkflowPanel
      description="Revise o conteúdo da mensagem e visualize a prévia antes de agendar."
      icon={<CheckCircle2 />}
      title="Mensagem e revisão"
    >
      <div className="crm-visit-step-two-layout">
        {/* Column 1: Message Editor */}
        <div className="crm-visit-section-card">
          <div className="crm-visit-section-header">
            <span className="crm-visit-section-icon">
              <MessageSquare aria-hidden="true" />
            </span>
            <div>
              <h3>Texto da Mensagem</h3>
              <p>Digite sua mensagem ou selecione um modelo pronto</p>
            </div>
          </div>

          <div className="crm-visit-quick-group">
            <span className="crm-visit-quick-group-label">
              <Zap aria-hidden="true" />
              Modelos Rápidos:
            </span>
            <div className="crm-visit-quick-preset-pills">
              {CRM_SCHEDULE_MESSAGE_TEMPLATES.map((tpl) => (
                <button
                  className="crm-visit-preset-btn"
                  key={tpl.label}
                  onClick={() => onContentChange(tpl.text)}
                  type="button"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <FeatureField label="Mensagem">
            <FeatureTextarea
              aria-label="Mensagem"
              maxLength={4000}
              onChange={(event) => onContentChange(event.target.value)}
              placeholder="Digite o texto da mensagem a ser enviada..."
              rows={6}
              value={content}
            />
          </FeatureField>
          <small className="crm-schedule-character-count">
            {content.length}/4000 caracteres
          </small>
        </div>

        {/* Column 2: Review & Live Preview */}
        <div className="crm-visit-review-card">
          <header className="crm-visit-review-header">
            <div className="crm-visit-review-badge">
              <Calendar aria-hidden="true" />
              <span>Resumo do Disparo</span>
            </div>
            <span className="crm-visit-status-badge" data-status="scheduled">
              Pendente
            </span>
          </header>

          <div aria-label="Previa do agendamento" className="crm-visit-review">
            <div>
              <span>
                <UserRound aria-hidden="true" />
                Cliente
              </span>
              <strong>
                {destinationMode === "phone"
                  ? phone || "Novo número"
                  : targetCycle
                    ? formatCycleName(targetCycle)
                    : activeSession
                      ? formatCycleName(activeSession)
                      : "Conversa"}
              </strong>
            </div>

            <div>
              <span>
                <CalendarClock aria-hidden="true" />
                Data e hora
              </span>
              <strong>{formatVisitDateTime(scheduledAt)}</strong>
            </div>

            <div>
              <span>
                <MessageSquare aria-hidden="true" />
                Mensagem
              </span>
              <div className="crm-schedule-whatsapp-bubble">
                <p>{content.trim() || "Sua mensagem aparecerá aqui."}</p>
                <span className="crm-schedule-whatsapp-time">
                  Prévia
                  <CheckCircle2 aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CrmWorkflowPanel>
  );
}

export function isScheduleDateValid(value: string) {
  return (
    Boolean(value.trim()) &&
    !Number.isNaN(new Date(value).getTime()) &&
    new Date(value) > new Date()
  );
}

function formatVisitDateTime(value: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    return "Data nao informada";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}
