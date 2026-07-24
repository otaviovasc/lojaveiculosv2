import {
  CalendarClock,
  CarFront,
  MessageCircle,
  UserRound,
} from "lucide-react";
import {
  FeatureInput,
  FeatureSelect,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { crmWhatsappSessionHash } from "./crmRouteState";
import { CrmWhatsappWorkflowPanel } from "./CrmWhatsappWorkflow";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";
import type { CrmWhatsappVehicleOption } from "./crmWhatsappExtraTypes";

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
  activeSession: CrmWhatsappSession | null;
  isLoadingVehicles: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  onSelectedListingIdChange: (value: string) => void;
  onScheduledAtChange: (value: string) => void;
  scheduledAt: string;
  selectedListingId: string;
  step: number;
  vehicleOptions: readonly CrmWhatsappVehicleOption[];
}) {
  if (step === 0) {
    return (
      <CrmWhatsappWorkflowPanel
        description="A visita sera registrada no lead ligado a esta conversa."
        title="Confirme o cliente"
      >
        {activeSession?.leadId ? (
          <div className="crm-whatsapp-visit-contact">
            <span aria-hidden="true">
              <UserRound />
            </span>
            <div>
              <strong>
                {activeSession.buyerName ??
                  activeSession.buyerPhone ??
                  "Contato sem nome"}
              </strong>
              <small>
                {activeSession.buyerPhone ?? "Telefone nao informado"}
              </small>
            </div>
            <div className="crm-whatsapp-visit-contact-links">
              <a href={`#/crm?surface=leads&leadId=${activeSession.leadId}`}>
                Ver lead
              </a>
              <a href={`#${crmWhatsappSessionHash(activeSession.id)}`}>
                <MessageCircle aria-hidden="true" />
                Ver conversa
              </a>
            </div>
          </div>
        ) : (
          <div className="crm-whatsapp-visit-create-empty" role="status">
            <MessageCircle aria-hidden="true" />
            <strong>Nenhuma conversa com lead selecionada</strong>
            <p>Abra uma conversa vinculada a um lead e retorne a Visitas.</p>
          </div>
        )}
      </CrmWhatsappWorkflowPanel>
    );
  }

  if (step === 1) {
    return (
      <CrmWhatsappWorkflowPanel
        description="Escolha o horario combinado e registre o contexto necessario."
        title="Defina os detalhes"
      >
        <div className="crm-whatsapp-visit-create-grid">
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
      </CrmWhatsappWorkflowPanel>
    );
  }

  return (
    <CrmWhatsappWorkflowPanel
      description="A visita sera criada assim que voce confirmar."
      title="Revise o agendamento"
    >
      <div className="crm-whatsapp-visit-review">
        <ReviewItem
          icon={<UserRound aria-hidden="true" />}
          label="Cliente"
          value={
            activeSession?.buyerName ??
            activeSession?.buyerPhone ??
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
    </CrmWhatsappWorkflowPanel>
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
