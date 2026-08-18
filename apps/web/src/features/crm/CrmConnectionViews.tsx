import { MessageCircle } from "lucide-react";
import {
  ConnectionSectionCard,
  ConnectionStatusCard,
} from "./CrmConnectionAdminParts";
import type { CrmProviderConnection } from "./crmConversationTypes";
import { readCrmProviderLabel } from "./crmConnectionStatus";
import { crmSupportUrl } from "./crmSupport";

type SharedProps = {
  connection: CrmProviderConnection;
  disabled: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
};

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
    <div className="crm-connection-dashboard">
      <ConnectionStatusCard
        connection={props.connection}
        disabled={props.disabled}
        isRefreshing={props.isRefreshing}
        onRefresh={props.onRefresh}
      />
      <ConnectionSectionCard
        description="A equipe prepara o canal depois da confirmação do pagamento."
        icon={<MessageCircle aria-hidden="true" />}
        title="Configuração da Z-API"
      >
        <p className="crm-connection-webhook-note">
          O pareamento e o status do telefone ficam disponíveis quando a conexão
          estiver pronta. O CRM não exibe credenciais nem controles técnicos do
          provedor.
        </p>
      </ConnectionSectionCard>
      {localError ? (
        <div className="grid gap-2" role="alert">
          <p className="crm-connection-error">{localError}</p>
          <a
            className="crm-connection-save"
            href={crmSupportUrl(
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

function readConnectionSetupSupportCode(connection: CrmProviderConnection) {
  return connection.setup?.supportCode?.trim() || null;
}

export function ConnectionDashboard(props: SharedProps) {
  if (props.connection.provider === "olx") {
    return (
      <div className="crm-connection-dashboard">
        <ConnectionStatusCard
          connection={props.connection}
          disabled={props.disabled}
          isRefreshing={props.isRefreshing}
          onRefresh={props.onRefresh}
        />
        <ConnectionSectionCard
          description="O canal OLX Chat permite somente mensagens de texto em conversas iniciadas pelo comprador."
          icon={<MessageCircle aria-hidden="true" />}
          title="Capacidades do OLX Chat"
        >
          <dl className="crm-connection-capability-matrix">
            <div>
              <dt>Mensagens de texto</dt>
              <dd>Disponível</dd>
            </div>
            <div>
              <dt>Novas conversas</dt>
              <dd>Somente pelo comprador</dd>
            </div>
          </dl>
        </ConnectionSectionCard>
      </div>
    );
  }

  if (props.connection.provider !== "zapi") {
    return <OfficialConnectionOverview {...props} />;
  }

  return (
    <div className="crm-connection-dashboard">
      <ConnectionStatusCard
        connection={props.connection}
        disabled={props.disabled}
        isRefreshing={props.isRefreshing}
        onRefresh={props.onRefresh}
      />
      <p className="crm-connection-webhook-note">
        A instância está configurada. Para trocar o aparelho, use o pareamento
        seguro da seção de conexão; credenciais e configurações técnicas não são
        exibidas.
      </p>
    </div>
  );
}

function OfficialConnectionOverview(props: SharedProps) {
  const providerLabel = readCrmProviderLabel(props.connection.provider);
  return (
    <div className="crm-connection-dashboard">
      <ConnectionStatusCard
        connection={props.connection}
        disabled={props.disabled}
        isRefreshing={props.isRefreshing}
        onRefresh={props.onRefresh}
      />
      <ConnectionSectionCard
        description="A autorização e o recebimento de mensagens são protegidos e gerenciados automaticamente."
        icon={<MessageCircle aria-hidden="true" />}
        title={`${providerLabel} conectado`}
      >
        <p className="crm-connection-webhook-note">
          Use Atualizar status para consultar novamente a conexão. Este painel
          não exibe dados protegidos nem controles do provedor.
        </p>
      </ConnectionSectionCard>
    </div>
  );
}
