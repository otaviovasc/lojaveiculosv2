import { ChevronDown, Webhook } from "lucide-react";
import type { ReactNode } from "react";
import {
  ConnectionSectionCard,
  ConnectionStatusCard,
  ConnectionWebhookList,
} from "./CrmWhatsappConnectionAdminParts";
import type {
  CrmWhatsappConfigureWebhooksResult,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";
import { readCrmWhatsappProviderLabel } from "./crmWhatsappConnectionStatus";
import { crmWhatsappSupportUrl } from "./crmWhatsappSupport";

type SharedProps = {
  connection: CrmWhatsappProviderConnection;
  disabled: boolean;
  isConfiguringWebhooks: boolean;
  isRefreshing: boolean;
  onConfigureWebhooks: () => void;
  onRefresh: () => void;
  webhookConfigResult: CrmWhatsappConfigureWebhooksResult | null;
};

function readWebhookAutoConfig(props: SharedProps) {
  return {
    disabled: props.disabled,
    isConfiguring: props.isConfiguringWebhooks,
    onConfigure: props.onConfigureWebhooks,
    result: props.webhookConfigResult,
    supportCode: readConnectionSetupSupportCode(props.connection),
  };
}

export function ConnectionSetupFlow({
  localError,
  ...props
}: SharedProps & {
  localError: string | null;
}) {
  if (props.connection.provider !== "zapi") {
    return <OfficialConnectionOverview {...props} />;
  }

  return (
    <div className="crm-whatsapp-connection-dashboard">
      <ConnectionStatusCard
        connection={props.connection}
        isRefreshing={props.isRefreshing}
        onRefresh={props.onRefresh}
      />
      <ConnectionSectionCard
        description="Nossa equipe prepara o canal depois da confirmação do pagamento."
        icon={<Webhook aria-hidden="true" />}
        title="Configuração da Z-API"
      >
        <ConnectionWebhookList
          autoConfig={readWebhookAutoConfig(props)}
          embedded
        />
      </ConnectionSectionCard>
      {localError ? (
        <div className="grid gap-2" role="alert">
          <p className="crm-whatsapp-connection-error">{localError}</p>
          <a
            className="crm-whatsapp-connection-save"
            href={crmWhatsappSupportUrl(
              readConnectionSetupSupportCode(props.connection),
            )}
            rel="noreferrer"
            target="_blank"
          >
            Falar com o suporte
          </a>
        </div>
      ) : null}
    </div>
  );
}

function readConnectionSetupSupportCode(
  connection: CrmWhatsappProviderConnection,
) {
  return connection.setup?.supportCode?.trim() || null;
}

export function ConnectionDashboard(props: SharedProps) {
  if (props.connection.provider !== "zapi") {
    return <OfficialConnectionOverview {...props} />;
  }

  return (
    <div className="crm-whatsapp-connection-dashboard">
      <ConnectionStatusCard
        connection={props.connection}
        isRefreshing={props.isRefreshing}
        onRefresh={props.onRefresh}
      />
      <div className="crm-whatsapp-connection-disclosures">
        <ConnectionDisclosure
          description="Recebimento protegido de mensagens e atualizações."
          icon={<Webhook aria-hidden="true" />}
          title="Configuração automática"
        >
          <ConnectionWebhookList
            autoConfig={readWebhookAutoConfig(props)}
            embedded
          />
        </ConnectionDisclosure>
      </div>
    </div>
  );
}

function OfficialConnectionOverview(props: SharedProps) {
  const providerLabel = readCrmWhatsappProviderLabel(props.connection.provider);
  return (
    <div className="crm-whatsapp-connection-dashboard">
      <ConnectionStatusCard
        connection={props.connection}
        isRefreshing={props.isRefreshing}
        onRefresh={props.onRefresh}
      />
      <ConnectionSectionCard
        description="A autorização e o recebimento de mensagens são protegidos e gerenciados automaticamente."
        icon={<Webhook aria-hidden="true" />}
        title={`${providerLabel} conectado`}
      >
        <p className="crm-whatsapp-connection-webhook-note">
          Use Atualizar status para consultar novamente a conexao. Este painel
          não exibe dados protegidos do canal oficial.
        </p>
      </ConnectionSectionCard>
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
