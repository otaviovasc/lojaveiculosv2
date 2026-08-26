import { ArrowRight, QrCode } from "lucide-react";
import { InstagramLogo, MetaLogo, WhatsAppLogo } from "./CrmChannelLogos";
import type { MarketplaceApi } from "../marketplaces/apiClient";
import { groupCrmConnectionsByChannel } from "./crmChannelPresentation";
import type { CrmConversationApi } from "./crmConversationApi";
import type {
  CrmAvailableSetup,
  CrmProviderConnection,
  CrmSetupProvider,
} from "./crmConversationTypes";
import {
  ChannelIdentity,
  ConnectedChannelRow,
} from "./CrmChannelDirectoryParts";
import { CrmOlxChannelCard } from "./CrmChannelDirectoryOlx";
import { isComposioConnectionForProvider } from "./crmComposioOAuth";

export function CrmChannelDirectory({
  availableSetups,
  connections = [],
  crmApi,
  marketplaceApi,
  onChoose,
  onConnectionsChanged,
  onManageConnection,
  onRepairConnection,
  onRedirect,
  showSetupActions = true,
  showRepairActions = false,
  showZapiSetupActions = showSetupActions,
}: {
  availableSetups: readonly CrmAvailableSetup[];
  connections?: readonly CrmProviderConnection[];
  crmApi?: Pick<CrmConversationApi, "retryOlxChatSetup">;
  marketplaceApi?: MarketplaceApi;
  onChoose: (
    provider: CrmSetupProvider,
    channel?: "instagram" | "whatsapp",
  ) => void;
  onConnectionsChanged?: () => Promise<void> | void;
  onManageConnection?: (connection: CrmProviderConnection) => void;
  onRepairConnection?: (connection: CrmProviderConnection) => void;
  onRedirect?: (url: string) => void;
  showRepairActions?: boolean;
  showSetupActions?: boolean;
  showZapiSetupActions?: boolean;
}) {
  const officialAvailable = availableSetups.some(
    (setup) =>
      setup.channel === "whatsapp" &&
      setup.provider === "meta_cloud" &&
      setup.broker === "composio",
  );
  const officialConfigured = connections.some(
    (connection) =>
      isComposioConnectionForProvider(connection, "whatsapp") &&
      isReadyCrmConnection(connection),
  );
  const instagramAvailable = availableSetups.some(
    (setup) =>
      setup.channel === "instagram" &&
      setup.provider === "meta_cloud" &&
      setup.broker === "composio",
  );
  const instagramConfigured = connections.some(
    (connection) =>
      isComposioConnectionForProvider(connection, "instagram") &&
      (connection.state ?? connection.status) !== "archived",
  );
  // A configured Z-API connection is already represented by its connected
  // row below. Do not render the catalog/setup row as a second card for the
  // same provider, including while the provider is reconnecting or pending.
  const hasExistingZapiConnection = connections.some(
    (connection) =>
      connection.provider === "zapi" &&
      (connection.state ?? connection.status) !== "archived",
  );
  const groups = groupCrmConnectionsByChannel(connections);
  const connectionsFor = (channel: "instagram" | "olx_chat" | "whatsapp") =>
    groups.find((group) => group.channel === channel)?.connections ?? [];
  const invalidGroup = groups.find((group) => group.invalid);

  return (
    <section aria-label="Canais" className="crm-channel-directory-shell">
      <div className="crm-channel-directory-groups">
        <ChannelGroup label="WhatsApp">
          {connectionsFor("whatsapp").map((connection) => (
            <li key={connection.id}>
              <ConnectedChannelRow
                connection={connection}
                {...(onManageConnection
                  ? { onManage: onManageConnection }
                  : {})}
                {...(showRepairActions &&
                connection.provider === "zapi" &&
                onRepairConnection
                  ? { onRepair: onRepairConnection }
                  : {})}
              />
            </li>
          ))}
          {showZapiSetupActions && !hasExistingZapiConnection ? (
            <li>
              <button
                className="crm-channel-row"
                data-actionable="true"
                data-channel="whatsapp"
                data-provider="zapi"
                onClick={() => onChoose("zapi")}
                type="button"
              >
                <span aria-hidden="true" className="crm-channel-card-watermark">
                  <WhatsAppLogo />
                </span>
                <span aria-hidden="true" className="crm-channel-icon">
                  <WhatsAppLogo />
                </span>
                <span className="crm-channel-body">
                  <span className="crm-channel-title">
                    <strong>Z-API</strong>
                    <span className="crm-channel-badge" data-tone="muted">
                      Credencial da loja
                    </span>
                  </span>
                  <span className="crm-channel-description">
                    Cadastre as três credenciais da loja para configurar este
                    transporte do CRM.
                  </span>
                  <ChannelIdentity
                    broker="Credencial direta"
                    channel="WhatsApp"
                    transport="Z-API"
                  />
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="crm-channel-chevron"
                />
              </button>
            </li>
          ) : null}
          {showSetupActions ? (
            <li>
              {officialAvailable || officialConfigured ? (
                <button
                  className="crm-channel-row"
                  data-channel="whatsapp"
                  data-provider="meta_cloud"
                  onClick={() => onChoose("meta_cloud", "whatsapp")}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="crm-channel-card-watermark"
                  >
                    <MetaLogo />
                  </span>
                  <span aria-hidden="true" className="crm-channel-icon">
                    <MetaLogo />
                  </span>
                  <span className="crm-channel-body">
                    <span className="crm-channel-title">
                      <strong>WhatsApp Oficial</strong>
                      {officialConfigured ? (
                        <span className="crm-channel-badge" data-tone="muted">
                          Já conectado
                        </span>
                      ) : null}
                    </span>
                    <span className="crm-channel-description">
                      {officialConfigured
                        ? "Abra para revisar ou reautorizar a conexão oficial."
                        : "Autorize a conta Meta em uma página segura e escolha o número remetente."}
                    </span>
                    <ChannelIdentity
                      broker="Composio"
                      channel="WhatsApp"
                      transport="Meta Cloud"
                    />
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="crm-channel-chevron"
                  />
                </button>
              ) : (
                <div
                  aria-disabled="true"
                  className="crm-channel-row"
                  data-actionable="false"
                  data-channel="whatsapp"
                  data-provider="meta_cloud"
                >
                  <span
                    aria-hidden="true"
                    className="crm-channel-card-watermark"
                  >
                    <MetaLogo />
                  </span>
                  <span aria-hidden="true" className="crm-channel-icon">
                    <MetaLogo />
                  </span>
                  <span className="crm-channel-body">
                    <span className="crm-channel-title">
                      <strong>WhatsApp Oficial</strong>
                      <span className="crm-channel-badge" data-tone="muted">
                        Indisponível
                      </span>
                    </span>
                    <span className="crm-channel-description">
                      A configuração oficial não está disponível para esta loja
                      no momento. Nenhuma operação oficial foi iniciada.
                    </span>
                    <ChannelIdentity
                      broker="Composio"
                      channel="WhatsApp"
                      transport="Meta Cloud"
                    />
                  </span>
                </div>
              )}
            </li>
          ) : null}
        </ChannelGroup>

        <ChannelGroup label="Instagram">
          {connectionsFor("instagram").map((connection) => (
            <li key={connection.id}>
              <ConnectedChannelRow
                connection={connection}
                {...(onManageConnection
                  ? { onManage: onManageConnection }
                  : {})}
              />
            </li>
          ))}
          {showSetupActions ? (
            <li>
              {instagramAvailable || instagramConfigured ? (
                <button
                  className="crm-channel-row"
                  data-actionable="true"
                  data-channel="instagram"
                  data-provider="meta_cloud"
                  onClick={() => onChoose("meta_cloud", "instagram")}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="crm-channel-card-watermark"
                  >
                    <InstagramLogo />
                  </span>
                  <span aria-hidden="true" className="crm-channel-icon">
                    <InstagramLogo />
                  </span>
                  <span className="crm-channel-body">
                    <span className="crm-channel-title">
                      <strong>Instagram Oficial</strong>
                      {instagramConfigured ? (
                        <span className="crm-channel-badge" data-tone="muted">
                          Já configurado
                        </span>
                      ) : null}
                    </span>
                    <span className="crm-channel-description">
                      {instagramConfigured
                        ? "Abra para revisar ou reautorizar a conta e o perfil oficial."
                        : "Autorize a conta Meta em uma página segura e escolha o perfil do Instagram."}
                    </span>
                    <ChannelIdentity
                      broker="Composio"
                      channel="Instagram"
                      transport="Meta Cloud"
                    />
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="crm-channel-chevron"
                  />
                </button>
              ) : (
                <div
                  aria-disabled="true"
                  className="crm-channel-row"
                  data-actionable="false"
                  data-channel="instagram"
                  data-provider="meta_cloud"
                >
                  <span
                    aria-hidden="true"
                    className="crm-channel-card-watermark"
                  >
                    <InstagramLogo />
                  </span>
                  <span aria-hidden="true" className="crm-channel-icon">
                    <InstagramLogo />
                  </span>
                  <span className="crm-channel-body">
                    <span className="crm-channel-title">
                      <strong>Instagram Oficial</strong>
                      <span className="crm-channel-badge" data-tone="muted">
                        Indisponível
                      </span>
                    </span>
                    <span className="crm-channel-description">
                      A configuração oficial não está disponível para esta loja
                      no momento. Nenhuma operação oficial foi iniciada.
                    </span>
                    <ChannelIdentity
                      broker="Composio"
                      channel="Instagram"
                      transport="Meta Cloud"
                    />
                  </span>
                </div>
              )}
            </li>
          ) : null}
        </ChannelGroup>

        <ChannelGroup label="OLX Chat">
          {connectionsFor("olx_chat").map((connection) => (
            <li key={connection.id}>
              <ConnectedChannelRow
                connection={connection}
                {...(onManageConnection
                  ? { onManage: onManageConnection }
                  : {})}
              />
            </li>
          ))}
          <li>
            <CrmOlxChannelCard
              connections={connections}
              showActions={showSetupActions}
              {...(crmApi ? { crmApi } : {})}
              {...(marketplaceApi ? { marketplaceApi } : {})}
              {...(onConnectionsChanged ? { onConnectionsChanged } : {})}
              {...(onRedirect ? { onRedirect } : {})}
            />
          </li>
        </ChannelGroup>

        {invalidGroup ? (
          <ChannelGroup invalid label={invalidGroup.channelLabel}>
            {invalidGroup.connections.map((connection) => (
              <li key={connection.id}>
                <div className="crm-channel-row" data-actionable="false">
                  <span className="crm-channel-body">
                    <span className="crm-channel-title">
                      {connection.displayName}
                      <span className="crm-channel-badge" data-tone="danger">
                        Contrato inválido
                      </span>
                    </span>
                    <span className="crm-channel-description">
                      O servidor não informou um canal válido para esta conexão.
                      Ela não pode ser usada no CRM até que o contrato seja
                      corrigido.
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ChannelGroup>
        ) : null}
      </div>
      {!availableSetups.length && showSetupActions && !connections.length ? (
        <p className="crm-channel-empty">
          Os canais com configuração direta já estão conectados nesta loja.
        </p>
      ) : null}
    </section>
  );
}

function isReadyCrmConnection(connection: CrmProviderConnection) {
  return (
    connection.channel === "whatsapp" &&
    (connection.state ?? connection.status) === "active" &&
    connection.readiness?.ready === true
  );
}

function ChannelGroup({
  children,
  invalid = false,
  label,
}: {
  children: React.ReactNode;
  invalid?: boolean;
  label: string;
}) {
  return (
    <section
      aria-label={label}
      className="crm-channel-group"
      {...(invalid ? { "data-invalid": "true" } : {})}
    >
      <h3 className="crm-channel-group-heading">{label}</h3>
      <ol
        aria-label={`Canais conectados e disponíveis de ${label}`}
        className="crm-channel-directory"
      >
        {children}
      </ol>
    </section>
  );
}
