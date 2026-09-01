import { MessageCircle, MessageSquare, Phone, UserRound } from "lucide-react";
import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { formatBrazilianPhone } from "../../lib/masks";
import { formatCycleName } from "./crmConversationModel";
import { formatCrmPhone } from "./crmPhoneFormat";
import { CrmWorkflowPanel } from "./CrmWorkflow";
import type { CrmConversationCycle } from "./crmConversationTypes";

export type ScheduleDestinationMode = "conversation" | "phone";

export function schedulePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isSchedulePhoneValid(value: string) {
  const digits = schedulePhoneDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function CrmScheduleRecipientStep({
  connectionAvailable,
  conversationCycles,
  destinationMode,
  isEditing,
  onDestinationModeChange,
  onPhoneChange,
  onTargetCycleIdChange,
  phone,
  targetCycle,
  targetCycleId,
}: {
  connectionAvailable: boolean;
  conversationCycles: CrmConversationCycle[];
  destinationMode: ScheduleDestinationMode;
  isEditing: boolean;
  onDestinationModeChange: (value: ScheduleDestinationMode) => void;
  onPhoneChange: (value: string) => void;
  onTargetCycleIdChange: (value: string) => void;
  phone: string;
  targetCycle: CrmConversationCycle | undefined;
  targetCycleId: string;
}) {
  return (
    <CrmWorkflowPanel
      description="A mensagem será programada para uma conversa existente ou um novo número."
      icon={<UserRound />}
      title={
        isEditing ? "Destinatário do agendamento" : "Escolha o destinatário"
      }
    >
      <div className="crm-visit-step-two-layout">
        <div className="crm-visit-section-card">
          <div className="crm-visit-section-header">
            <span className="crm-visit-section-icon">
              {destinationMode === "phone" ? (
                <Phone aria-hidden="true" />
              ) : (
                <MessageSquare aria-hidden="true" />
              )}
            </span>
            <div>
              <h3>
                {isEditing ? "Destinatário atual" : "Como deseja agendar?"}
              </h3>
              <p>
                {isEditing
                  ? "O destinatário não pode ser alterado depois da criação"
                  : "Use uma conversa do CRM ou informe um novo número"}
              </p>
            </div>
          </div>

          {!isEditing ? (
            <FeatureTabs
              ariaLabel="Tipo de destinatário"
              className="crm-schedule-target-tabs"
              onChange={onDestinationModeChange}
              optionClassName="crm-schedule-target-tab"
              options={[
                {
                  icon: MessageSquare,
                  label: "Conversa existente",
                  value: "conversation",
                },
                { icon: Phone, label: "Novo número", value: "phone" },
              ]}
              value={destinationMode}
              variant="split"
            />
          ) : null}

          {destinationMode === "conversation" ? (
            <FeatureField label="Conversa">
              <FeatureSelect
                ariaLabel="Conversa"
                disabled={isEditing}
                onChange={onTargetCycleIdChange}
                options={[
                  { label: "Selecione uma conversa", value: "" },
                  ...conversationCycles.map((cycle) => ({
                    label: formatCycleName(cycle),
                    value: String(cycle.id),
                  })),
                ]}
                placeholder="Selecione uma conversa"
                searchable={!isEditing}
                searchPlaceholder="Buscar por cliente ou telefone..."
                value={targetCycleId}
              />
            </FeatureField>
          ) : (
            <FeatureField
              hint={
                connectionAvailable
                  ? "Informe DDD e número. O código do Brasil é aplicado automaticamente."
                  : "Conecte um WhatsApp antes de agendar para um novo número."
              }
              label="Telefone"
            >
              <FeatureInput
                aria-label="Telefone"
                autoComplete="tel"
                disabled={isEditing || !connectionAvailable}
                inputMode="tel"
                onChange={(event) =>
                  onPhoneChange(formatBrazilianPhone(event.target.value))
                }
                placeholder="(11) 99999-9999"
                type="tel"
                value={phone}
              />
            </FeatureField>
          )}
        </div>

        {destinationMode === "conversation" ? (
          targetCycle ? (
            <ConversationSummary cycle={targetCycle} />
          ) : (
            <div className="crm-visit-create-empty" role="status">
              <MessageCircle aria-hidden="true" />
              <strong>Nenhuma conversa selecionada</strong>
              <p>
                Escolha uma conversa na lista para continuar com o agendamento.
              </p>
            </div>
          )
        ) : (
          <div className="crm-visit-section-card">
            <div className="crm-visit-section-header">
              <span className="crm-visit-section-icon">
                <Phone aria-hidden="true" />
              </span>
              <div>
                <h3>Novo contato</h3>
                <p>
                  A conversa será criada agora, sem enviar mensagem antes da
                  hora
                </p>
              </div>
            </div>
            <div className="crm-visit-contact">
              <span aria-hidden="true">
                <Phone />
              </span>
              <div>
                <strong>{phone || "Telefone ainda não informado"}</strong>
                <small>
                  {isSchedulePhoneValid(phone)
                    ? "Número pronto para agendamento"
                    : "Informe um número com DDD"}
                </small>
              </div>
            </div>
          </div>
        )}
      </div>
    </CrmWorkflowPanel>
  );
}

function ConversationSummary({ cycle }: { cycle: CrmConversationCycle }) {
  return (
    <div className="crm-visit-section-card">
      <div className="crm-visit-section-header">
        <span className="crm-visit-section-icon">
          <UserRound aria-hidden="true" />
        </span>
        <div>
          <h3>Dados do cliente</h3>
          <p>Informações vinculadas ao atendimento</p>
        </div>
      </div>
      <div className="crm-visit-contact">
        <span aria-hidden="true">
          <UserRound />
        </span>
        <div>
          <strong>
            {cycle.customerDisplayName ??
              (cycle.customerPhone
                ? formatCrmPhone(cycle.customerPhone)
                : "Contato sem nome")}
          </strong>
          <small>
            {cycle.customerPhone
              ? formatCrmPhone(cycle.customerPhone)
              : "Telefone não informado"}
          </small>
        </div>
        {cycle.leadId ? (
          <div className="crm-visit-contact-links">
            <a href={`#/crm?surface=leads&leadId=${cycle.leadId}`}>Ver lead</a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
