import {
  CalendarClock,
  CarFront,
  CheckCircle2,
  MessageCircle,
  UserRound,
} from "lucide-react";
import {
  FeatureInput,
  FeatureSelect,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { crmConversationCycleHash } from "./crmRouteState";
import { CrmWorkflowPanel } from "./CrmWorkflow";
import type { CrmConversationCycle } from "./crmConversationTypes";
import type { CrmVehicleOption } from "./crmConversationExtraTypes";

export const visitCreationSteps = [
  { description: "Conversa vinculada", label: "Cliente" },
  { description: "Quando e observacoes", label: "Detalhes" },
  { description: "Confira antes de criar", label: "Revisao" },
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
                  activeSession.customerPhone ??
                  "Contato sem nome"}
              </strong>
              <small>
                {activeSession.customerPhone ?? "Telefone nao informado"}
              </small>
            </div>
            <div className="crm-visit-contact-links">
              <a href={`#/crm?surface=leads&leadId=${activeSession.leadId}`}>
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
            <p>Abra uma conversa vinculada a um lead e retorne a Visitas.</p>
          </div>
        )}
      </CrmWorkflowPanel>
    );
  }

  if (step === 1) {
    return (
      <CrmWorkflowPanel
        description="Escolha o horario combinado e registre o contexto necessario."
        icon={<CalendarClock />}
        title="Defina os detalhes"
      >
        <div className="crm-visit-create-grid">
          <FeatureField label="Data e hora">
            <FeatureInput
              aria-label="Data da visita"
              onChange={(event) => onScheduledAtChange(event.target.value)}
              required
              type="datetime-local"
              value={scheduledAt}
            />
          </FeatureField>
          <FeatureField
            hint="Opcional. Deixe sem veículo específico para uma visita geral à loja."
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
                  ? "Carregando veículos..."
                  : "Sem veículo específico"
              }
              searchable
              searchPlaceholder="Buscar veículo..."
              value={selectedListingId}
            />
          </FeatureField>
          <FeatureField
            hint="Inclua preferências ou orientações para a equipe."
            label="Observacoes"
          >
            <FeatureTextarea
              aria-label="Observacoes da visita"
              maxLength={500}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Ex.: test drive do SUV prata"
              value={notes}
            />
          </FeatureField>
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
      <div className="crm-visit-review">
        <ReviewItem
          icon={<UserRound aria-hidden="true" />}
          label="Cliente"
          value={
            activeSession?.customerDisplayName ??
            activeSession?.customerPhone ??
            "Contato sem nome"
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
