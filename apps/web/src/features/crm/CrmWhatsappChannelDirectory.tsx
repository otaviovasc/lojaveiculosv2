import {
  ArrowRight,
  Camera,
  ExternalLink,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { crmWhatsappSupportUrl } from "./crmWhatsappSupport";
import type {
  CrmWhatsappSetupProvider,
  CrmWhatsappZapiAddonContract,
} from "./crmWhatsappTypes";

export function CrmWhatsappChannelDirectory({
  availableProviders,
  onChoose,
  zapiAddonContract,
}: {
  availableProviders: CrmWhatsappSetupProvider[];
  onChoose: (provider: CrmWhatsappSetupProvider) => void;
  zapiAddonContract: CrmWhatsappZapiAddonContract | null;
}) {
  const officialAvailable = availableProviders.includes("composio_whatsapp");
  return (
    <ol className="crm-whatsapp-channel-directory" aria-label="Adicionar canal">
      {!availableProviders.length ? (
        <li className="crm-whatsapp-channel-empty">
          Os canais com configuração direta já estão conectados nesta loja.
        </li>
      ) : null}
      <li>
        <button
          className="crm-whatsapp-channel-row"
          onClick={() => onChoose("zapi")}
          type="button"
        >
          <span aria-hidden="true" className="crm-whatsapp-channel-icon">
            <QrCode />
          </span>
          <span className="crm-whatsapp-channel-body">
            <span className="crm-whatsapp-channel-title">
              Z-API
              <ChannelBadge contract={zapiAddonContract} />
            </span>
            <span className="crm-whatsapp-channel-description">
              {readZapiChooserDescription(zapiAddonContract)}
            </span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className="crm-whatsapp-channel-chevron"
          />
        </button>
      </li>
      <li>
        {officialAvailable ? (
          <button
            className="crm-whatsapp-channel-row"
            onClick={() => onChoose("composio_whatsapp")}
            type="button"
          >
            <span aria-hidden="true" className="crm-whatsapp-channel-icon">
              <ShieldCheck />
            </span>
            <span className="crm-whatsapp-channel-body">
              <span className="crm-whatsapp-channel-title">
                WhatsApp Oficial
              </span>
              <span className="crm-whatsapp-channel-description">
                Autorize a conta Meta em uma página segura e escolha o número
                remetente.
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="crm-whatsapp-channel-chevron"
            />
          </button>
        ) : (
          <div
            aria-disabled="true"
            className="crm-whatsapp-channel-row"
            data-actionable="false"
          >
            <span aria-hidden="true" className="crm-whatsapp-channel-icon">
              <ShieldCheck />
            </span>
            <span className="crm-whatsapp-channel-body">
              <span className="crm-whatsapp-channel-title">
                WhatsApp Oficial
                <span className="crm-whatsapp-channel-badge" data-tone="muted">
                  Indisponível
                </span>
              </span>
              <span className="crm-whatsapp-channel-description">
                A configuração oficial não está disponível para esta loja no
                momento. Nenhuma operação oficial foi iniciada.
              </span>
            </span>
          </div>
        )}
      </li>
      <li>
        <div
          className="crm-whatsapp-channel-row"
          data-actionable="false"
          data-variant="support"
        >
          <span aria-hidden="true" className="crm-whatsapp-channel-icon">
            <Camera />
          </span>
          <span className="crm-whatsapp-channel-body">
            <span className="crm-whatsapp-channel-title">
              Instagram incluído
              <span className="crm-whatsapp-channel-badge" data-tone="muted">
                Com a equipe
              </span>
            </span>
            <span className="crm-whatsapp-channel-description">
              Sem custo adicional no CRM. A configuração é feita com ajuda da
              nossa equipe.
            </span>
          </span>
          <a
            className="crm-whatsapp-channel-support-link"
            href={crmWhatsappSupportUrl()}
            rel="noreferrer"
            target="_blank"
          >
            Pedir ajuda para configurar
            <ExternalLink aria-hidden="true" size={12} />
          </a>
        </div>
      </li>
    </ol>
  );
}

function ChannelBadge({
  contract,
}: {
  contract: CrmWhatsappZapiAddonContract | null;
}) {
  if (contract?.status === "active") {
    return (
      <span className="crm-whatsapp-channel-badge" data-tone="success">
        Adicional ativo
      </span>
    );
  }
  if (contract?.status === "pending") {
    return (
      <span className="crm-whatsapp-channel-badge">Pagamento pendente</span>
    );
  }
  if (contract?.status === "scheduled") {
    return (
      <span className="crm-whatsapp-channel-badge">Ativação agendada</span>
    );
  }
  if (contract?.status === "paid_awaiting_setup") {
    return <span className="crm-whatsapp-channel-badge">Em preparação</span>;
  }
  return (
    <span className="crm-whatsapp-channel-badge" data-tone="muted">
      Adicional opcional
    </span>
  );
}

function readZapiChooserDescription(
  contract: CrmWhatsappZapiAddonContract | null,
) {
  if (contract?.status === "pending") {
    return "Solicitação registrada; aguardando confirmação de pagamento.";
  }
  if (contract?.status === "scheduled") {
    return "Ativação programada para o próximo vencimento da assinatura.";
  }
  if (contract?.status === "paid_awaiting_setup") {
    return "Pagamento confirmado; a equipe está preparando a conexão.";
  }
  if (contract?.status === "active") {
    return "Adicional ativo. Informe as credenciais uma única vez para parear o telefone.";
  }
  return "Integração opcional paga. O valor e as condições vêm da assinatura da loja.";
}
