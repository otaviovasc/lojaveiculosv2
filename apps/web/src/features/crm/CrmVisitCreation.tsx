import {
  Calendar,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Link2,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { DatePickerField } from "../../components/ui/DatePickerField";
import {
  FeatureSelect,
  FeatureTextarea,
  TimePickerField,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { crmConversationCycleHash } from "./crmRouteState";
import { formatCrmPhone } from "./crmPhoneFormat";
import { CrmWorkflowPanel } from "./CrmWorkflow";
import { CrmDateTimeShortcuts } from "./CrmDateTimeShortcuts";
import type { CrmConversationCycle } from "./crmConversationTypes";
import type { CrmVehicleOption } from "./crmConversationExtraTypes";

export const visitCreationSteps = [
  { description: "Conversa vinculada", label: "Cliente" },
  { description: "Quando e observacoes", label: "Detalhes" },
  { description: "Confira antes de criar", label: "Revisao" },
] as const;

const visitPresets = [
  { dayOffset: 0, h: 10, label: "Hoje às 10h", m: 0 },
  { dayOffset: 0, h: 14, label: "Hoje às 14:30", m: 30 },
  { dayOffset: 1, h: 10, label: "Amanhã às 10h", m: 0 },
  { dayOffset: 1, h: 15, label: "Amanhã às 15h", m: 0 },
] as const;

export function VisitCreationStep({
  activeSession,
  notes,
  isLoadingVehicles,
  onNotesChange,
  onSelectedListingIdChange,
  onScheduledAtChange,
  scheduledAt,
  selectedListingId,
  step,
  vehicleOptions,
}: {
  activeSession: CrmConversationCycle | null;
  isLoadingVehicles: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  onSelectedListingIdChange: (value: string) => void;
  onScheduledAtChange: (value: string) => void;
  scheduledAt: string;
  selectedListingId: string;
  step: number;
  vehicleOptions: readonly CrmVehicleOption[];
}) {
  if (step === 0) {
    return (
      <CrmWorkflowPanel
        description="A visita sera registrada no lead ligado a esta conversa."
        icon={<UserRound />}
        title="Confirme o cliente"
      >
        {activeSession?.leadId ? (
          <div className="crm-visit-contact">
            <span aria-hidden="true">
              <UserRound />
            </span>
            <div>
              <strong>
                {activeSession.customerDisplayName ??
                  (activeSession.customerPhone
                    ? formatCrmPhone(activeSession.customerPhone)
                    : "Contato sem nome")}
              </strong>
              <small>
                {activeSession.customerPhone
                  ? formatCrmPhone(activeSession.customerPhone)
                  : "Telefone não informado"}
              </small>
            </div>
            <div className="crm-visit-contact-links">
              <a href={`#/crm?surface=leads&leadId=${activeSession.leadId}`}>
                <Link2 aria-hidden="true" />
                Ver lead
              </a>
              <a href={`#${crmConversationCycleHash(activeSession.id)}`}>
                <MessageCircle aria-hidden="true" />
                Ver conversa
              </a>
            </div>
          </div>
        ) : (
          <div className="crm-visit-create-empty" role="status">
            <MessageCircle aria-hidden="true" />
            <strong>Nenhuma conversa com lead selecionada</strong>
            <p>
              Abra uma conversa vinculada a um lead e retorne a Visitas para
              agendar.
            </p>
          </div>
        )}
      </CrmWorkflowPanel>
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

    const addQuickTag = (tag: string) => {
      if (!notes) {
        onNotesChange(tag);
      } else if (!notes.includes(tag)) {
        onNotesChange(`${notes} • ${tag}`);
      }
    };

    const selectedVehicle = vehicleOptions.find(
      (v) => v.listingId === selectedListingId,
    );

    return (
      <CrmWorkflowPanel
        description="Escolha a data, horário e detalhes para a equipe preparar o atendimento na loja."
        icon={<CalendarClock />}
        title="Defina os detalhes"
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
                <p>Selecione o dia e horário combinado com o cliente</p>
              </div>
            </div>

            {/* Standard DatePickerField & TimePickerField */}
            <div className="crm-visit-datetime-field-group">
              <div className="crm-visit-datepicker-block">
                <span className="crm-visit-field-label">Data da visita</span>
                <DatePickerField
                  label="Data"
                  onChange={handleDateChange}
                  value={parsedDate}
                />
              </div>
              <div className="crm-visit-timepicker-block">
                <span className="crm-visit-field-label">Horário da visita</span>
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
              presets={visitPresets}
            />

            {/* Hidden input for programmatic accessibility / tests */}
            <input
              aria-label="Data da visita"
              className="sr-only"
              onChange={(event) => onScheduledAtChange(event.target.value)}
              tabIndex={-1}
              type="datetime-local"
              value={scheduledAt}
            />
          </div>

          {/* Column 2: Vehicle & Context Section */}
          <div className="crm-visit-section-card">
            <div className="crm-visit-section-header">
              <span className="crm-visit-section-icon">
                <CarFront aria-hidden="true" />
              </span>
              <div>
                <h3>Veículo e Contexto</h3>
                <p>Vincule um carro do estoque e anote necessidades</p>
              </div>
            </div>

            <FeatureField
              hint="Opcional. Deixe sem veículo para uma visita geral à loja."
              label="Veículo de interesse"
            >
              <FeatureSelect
                ariaLabel="Veículo de interesse"
                disabled={isLoadingVehicles}
                onChange={onSelectedListingIdChange}
                options={[
                  { label: "Sem veículo específico", value: "" },
                  ...vehicleOptions.map((vehicle) => ({
                    label: vehicle.title,
                    value: vehicle.listingId,
                  })),
                ]}
                placeholder={
                  isLoadingVehicles
                    ? "Carregando estoque..."
                    : "Sem veículo específico"
                }
                searchable
                searchPlaceholder="Buscar veículo no estoque..."
                value={selectedListingId}
              />
            </FeatureField>

            {selectedVehicle ? (
              <div className="crm-visit-selected-vehicle-badge">
                <CarFront aria-hidden="true" />
                <span>
                  Veículo vinculado: <strong>{selectedVehicle.title}</strong>
                </span>
              </div>
            ) : null}

            {/* Quick Context / Purpose Tags */}
            <div className="crm-visit-quick-group">
              <span className="crm-visit-quick-group-label">
                Finalidade / Motivo:
              </span>
              <div className="crm-visit-quick-tags">
                <button
                  className="crm-visit-tag-btn"
                  onClick={() => addQuickTag("Test drive agendado")}
                  type="button"
                >
                  🚗 Test Drive
                </button>
                <button
                  className="crm-visit-tag-btn"
                  onClick={() => addQuickTag("Avaliação na troca")}
                  type="button"
                >
                  🔄 Avaliação na Troca
                </button>
                <button
                  className="crm-visit-tag-btn"
                  onClick={() => addQuickTag("Simulação de financiamento")}
                  type="button"
                >
                  📋 Financiamento
                </button>
                <button
                  className="crm-visit-tag-btn"
                  onClick={() => addQuickTag("Apresentação de proposta")}
                  type="button"
                >
                  🤝 Proposta Comercial
                </button>
              </div>
            </div>

            <FeatureField
              hint="Orientações para o vendedor ou recepcionista preparar."
              label="Observacoes"
            >
              <FeatureTextarea
                aria-label="Observacoes da visita"
                maxLength={500}
                onChange={(event) => onNotesChange(event.target.value)}
                placeholder="Ex.: Cliente virá acompanhado, test drive do modelo selecionado"
                value={notes}
              />
            </FeatureField>
          </div>
        </div>
      </CrmWorkflowPanel>
    );
  }

  return (
    <CrmWorkflowPanel
      description="A visita sera criada assim que voce confirmar."
      icon={<CheckCircle2 />}
      title="Revise o agendamento"
    >
      <div className="crm-visit-review-card">
        <header className="crm-visit-review-header">
          <div className="crm-visit-review-badge">
            <Calendar aria-hidden="true" />
            <span>Resumo do Agendamento</span>
          </div>
          <span className="crm-visit-status-badge" data-status="scheduled">
            Agendamento Novo
          </span>
        </header>
        <div className="crm-visit-review">
          <ReviewItem
            icon={<UserRound aria-hidden="true" />}
            label="Cliente"
            value={
              activeSession?.customerDisplayName ??
              (activeSession?.customerPhone
                ? formatCrmPhone(activeSession.customerPhone)
                : "Contato sem nome")
            }
          />
          <ReviewItem
            icon={<CalendarClock aria-hidden="true" />}
            label="Data e hora"
            value={formatVisitDateTime(scheduledAt)}
          />
          <ReviewItem
            icon={<CarFront aria-hidden="true" />}
            label="Veículo de interesse"
            value={
              vehicleOptions.find(
                (vehicle) => vehicle.listingId === selectedListingId,
              )?.title ?? "Sem veículo específico"
            }
          />
          <ReviewItem
            label="Observacoes"
            value={notes.trim() || "Sem observacoes"}
          />
        </div>
      </div>
    </CrmWorkflowPanel>
  );
}

export function isVisitScheduleValid(value: string) {
  return Boolean(value.trim()) && !Number.isNaN(new Date(value).getTime());
}

function ReviewItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function formatVisitDateTime(value: string) {
  if (!isVisitScheduleValid(value)) return "Data nao informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}
