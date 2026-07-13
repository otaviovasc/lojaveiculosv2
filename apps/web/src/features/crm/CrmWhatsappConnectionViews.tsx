import { ChevronDown, KeyRound, RefreshCw, Webhook } from "lucide-react";
import type { ReactNode } from "react";
import {
  CrmWhatsappWorkflowFooter,
  CrmWhatsappWorkflowPanel,
  CrmWhatsappWorkflowStepper,
} from "./CrmWhatsappWorkflow";
import {
  ConnectionStatusCard,
  ConnectionWebhookList,
} from "./CrmWhatsappConnectionAdminParts";
import {
  ConnectionInstanceForm,
  type InstanceDraft,
} from "./CrmWhatsappConnectionInstanceForm";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappWebhookEndpoint,
} from "./crmWhatsappTypes";

const setupSteps = [
  { label: "Credenciais", description: "Instancia protegida" },
  { label: "Webhooks", description: "Eventos da ZAPI" },
  { label: "Verificar", description: "Conexao em tempo real" },
] as const;

type SharedProps = {
  connection: CrmWhatsappProviderConnection;
  copiedWebhook: string | null;
  disabled: boolean;
  draft: InstanceDraft;
  isRefreshing: boolean;
  isSaving: boolean;
  onCopy: (endpoint: CrmWhatsappWebhookEndpoint) => void;
  onDraftChange: (draft: InstanceDraft) => void;
  onRefresh: () => void;
  onSave: () => void;
};

export function ConnectionSetupFlow({
  currentStep,
  localError,
  nextDisabled,
  onCancel,
  onNext,
  onStepChange,
  ...props
}: SharedProps & {
  currentStep: number;
  localError: string | null;
  nextDisabled: boolean;
  onCancel: () => void;
  onNext: () => void;
  onStepChange: (step: number) => void;
}) {
  return (
    <div className="crm-whatsapp-connection-setup crm-whatsapp-workflow">
      <CrmWhatsappWorkflowStepper
        currentStep={currentStep}
        onStepChange={onStepChange}
        steps={setupSteps}
      />
      {currentStep === 0 ? (
        <CrmWhatsappWorkflowPanel
          description="O token e armazenado pelo backend e nunca volta ao navegador."
          title="Credenciais da instancia"
        >
          <ConnectionInstanceForm
            connection={props.connection}
            disabled={props.disabled}
            draft={props.draft}
            embedded
            hideSave
            isSaving={props.isSaving}
            onChange={props.onDraftChange}
            onSave={props.onSave}
          />
        </CrmWhatsappWorkflowPanel>
      ) : null}
      {currentStep === 1 ? (
        <CrmWhatsappWorkflowPanel
          description="Copie cada URL para o evento correspondente no painel da ZAPI."
          title="Webhooks da conexao"
        >
          <ConnectionWebhookList
            copiedType={props.copiedWebhook}
            embedded
            endpoints={props.connection.webhookEndpoints ?? []}
            onCopy={props.onCopy}
            tokenRequired={Boolean(props.connection.webhookTokenRequired)}
          />
        </CrmWhatsappWorkflowPanel>
      ) : null}
      {currentStep === 2 ? (
        <CrmWhatsappWorkflowPanel
          description="A verificacao consulta o provedor; nenhum estado online e simulado."
          title="Verificar conexao"
        >
          <ConnectionStatusCard
            connection={props.connection}
            isRefreshing={props.isRefreshing}
            onRefresh={props.onRefresh}
            showRefresh={false}
          />
        </CrmWhatsappWorkflowPanel>
      ) : null}
      {localError ? (
        <p className="crm-whatsapp-connection-error" role="alert">
          {localError}
        </p>
      ) : null}
      <CrmWhatsappWorkflowFooter
        backDisabled={currentStep === 0}
        cancelLabel="Sair da configuracao"
        confirmIcon={<RefreshCw aria-hidden="true" />}
        confirmLabel="Verificar conexao"
        isBusy={props.isSaving || props.isRefreshing}
        isLastStep={currentStep === setupSteps.length - 1}
        nextDisabled={nextDisabled}
        onBack={() => onStepChange(Math.max(0, currentStep - 1))}
        onCancel={onCancel}
        onNext={onNext}
      />
    </div>
  );
}

export function ConnectionDashboard(props: SharedProps) {
  return (
    <div className="crm-whatsapp-connection-dashboard">
      <ConnectionStatusCard
        connection={props.connection}
        isRefreshing={props.isRefreshing}
        onRefresh={props.onRefresh}
      />
      <div className="crm-whatsapp-connection-disclosures">
        <ConnectionDisclosure
          description="Atualize ID ou token somente quando necessario."
          icon={<KeyRound aria-hidden="true" />}
          title="Credenciais protegidas"
        >
          <ConnectionInstanceForm
            connection={props.connection}
            disabled={props.disabled}
            draft={props.draft}
            embedded
            isSaving={props.isSaving}
            onChange={props.onDraftChange}
            onSave={props.onSave}
          />
        </ConnectionDisclosure>
        <ConnectionDisclosure
          description={`${props.connection.webhookEndpoints?.length ?? 0} URLs geradas pelo backend.`}
          icon={<Webhook aria-hidden="true" />}
          title="Webhooks da integracao"
        >
          <ConnectionWebhookList
            copiedType={props.copiedWebhook}
            embedded
            endpoints={props.connection.webhookEndpoints ?? []}
            onCopy={props.onCopy}
            tokenRequired={Boolean(props.connection.webhookTokenRequired)}
          />
        </ConnectionDisclosure>
      </div>
    </div>
  );
}

function ConnectionDisclosure({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <details className="crm-whatsapp-connection-disclosure">
      <summary>
        <span>{icon}</span>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div>{children}</div>
    </details>
  );
}
