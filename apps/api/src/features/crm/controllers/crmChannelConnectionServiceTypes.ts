import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmExternalBotIntegration } from "../../../domains/crm/ports/crmExternalBotIntegrationRepository.js";
import type { CrmChannelConnection } from "../../../domains/crm/channelConnections/channelConnectionModels.js";
import type { UpdateCrmChannelConnectionInput } from "../../../domains/crm/channelConnections/channelConnectionUpdates.js";
import type {
  CreateCrmChannelConnectionInput,
  CrmChannelConnectionOverview,
} from "../../../domains/crm/channelConnections/connectionCreation.js";
import type {
  AuthorizeComposioChannelConnectionInput,
  CompleteComposioChannelConnectionResult,
  SelectComposioChannelSenderInput,
} from "../../../domains/crm/services/CrmChannelConnectionService/composioChannelConnectionSetup.js";
import type {
  RequestZapiPairingCodeInput,
  RequestZapiPairingQrInput,
} from "../../../domains/crm/services/CrmWhatsappService/zapiWhatsappConnectionSetup.js";
import type {
  disconnectZapiConnection,
  refreshZapiConnectionStatus,
} from "../../../domains/crm/services/CrmWhatsappService/zapiConnectionLifecycle.js";
import type { UpdateExternalBotIntegrationInput } from "../../../domains/crm/services/CrmExternalBotService/externalBotIntegration.js";
import type { archiveAbandonedZapiConnections } from "../../../domains/crm/services/CrmWhatsappService/archiveAbandonedZapiConnections.js";
import type {
  configureZapiWebhooksAsSupport,
  createZapiConnectionAsSupport,
  requestZapiPairingCodeAsSupport,
  requestZapiPairingQrAsSupport,
  updateZapiCredentialsAsSupport,
} from "../../../domains/crm/services/CrmWhatsappService/manageZapiConnectionAsSupport.js";
import type { retryOlxChatSetup } from "../../../domains/crm/services/CrmService/retryOlxChatSetup.js";
import type { repairZapiConnectionCredentials } from "../../../domains/crm/services/CrmWhatsappService/repairZapiConnectionCredentials.js";
import type {
  getZapiConnectionReplacementStatus,
  startZapiConnectionReplacement,
} from "../../../domains/crm/services/CrmWhatsappService/replaceZapiConnection.js";

type ContextService<Input, Output> = (
  context: ServiceContext,
  input: Input,
) => Promise<Output>;

export type CrmChannelConnectionServices = {
  archiveAbandonedZapiConnections: ContextService<
    Parameters<typeof archiveAbandonedZapiConnections>[1],
    Awaited<ReturnType<typeof archiveAbandonedZapiConnections>>
  >;
  authorizeComposioCrmChannelConnection: ContextService<
    AuthorizeComposioChannelConnectionInput,
    { expiresAt: string; redirectUrl: string }
  >;
  completeComposioCrmChannelConnection: ContextService<
    AuthorizeComposioChannelConnectionInput,
    CompleteComposioChannelConnectionResult
  >;
  configureZapiWebhooksAsSupport: ContextService<
    Parameters<typeof configureZapiWebhooksAsSupport>[1],
    Awaited<ReturnType<typeof configureZapiWebhooksAsSupport>>
  >;
  createZapiConnectionAsSupport: ContextService<
    Parameters<typeof createZapiConnectionAsSupport>[1],
    Awaited<ReturnType<typeof createZapiConnectionAsSupport>>
  >;
  createChannelConnection: ContextService<
    CreateCrmChannelConnectionInput,
    CrmChannelConnection
  >;
  disconnectZapiConnection: ContextService<
    Parameters<typeof disconnectZapiConnection>[1],
    Awaited<ReturnType<typeof disconnectZapiConnection>>
  >;
  getExternalBotConfiguration: (
    context: ServiceContext,
  ) => Promise<CrmExternalBotIntegration>;
  getChannelConnectionOverview: (
    context: ServiceContext,
  ) => Promise<CrmChannelConnectionOverview>;
  listCrmChannelConnections: (
    context: ServiceContext,
  ) => Promise<readonly CrmChannelConnection[]>;
  requestZapiPairingCode: ContextService<
    RequestZapiPairingCodeInput,
    { code?: string; requested: boolean }
  >;
  requestZapiPairingQr: ContextService<
    RequestZapiPairingQrInput,
    { expiresAt: string; qrCode: string }
  >;
  repairZapiConnectionCredentials: ContextService<
    Parameters<typeof repairZapiConnectionCredentials>[1],
    Awaited<ReturnType<typeof repairZapiConnectionCredentials>>
  >;
  startZapiConnectionReplacement: ContextService<
    Parameters<typeof startZapiConnectionReplacement>[1],
    Awaited<ReturnType<typeof startZapiConnectionReplacement>>
  >;
  getZapiConnectionReplacementStatus: ContextService<
    Parameters<typeof getZapiConnectionReplacementStatus>[1],
    Awaited<ReturnType<typeof getZapiConnectionReplacementStatus>>
  >;
  retryOlxChatSetup: ContextService<
    Parameters<typeof retryOlxChatSetup>[1],
    Awaited<ReturnType<typeof retryOlxChatSetup>>
  >;
  refreshZapiConnectionStatus: ContextService<
    Parameters<typeof refreshZapiConnectionStatus>[1],
    Awaited<ReturnType<typeof refreshZapiConnectionStatus>>
  >;
  requestZapiPairingCodeAsSupport: ContextService<
    Parameters<typeof requestZapiPairingCodeAsSupport>[1],
    Awaited<ReturnType<typeof requestZapiPairingCodeAsSupport>>
  >;
  requestZapiPairingQrAsSupport: ContextService<
    Parameters<typeof requestZapiPairingQrAsSupport>[1],
    Awaited<ReturnType<typeof requestZapiPairingQrAsSupport>>
  >;
  selectComposioChannelSender: ContextService<
    SelectComposioChannelSenderInput,
    CrmChannelConnection
  >;
  updateExternalBotConfiguration: ContextService<
    UpdateExternalBotIntegrationInput,
    CrmExternalBotIntegration
  >;
  updateChannelConnection: ContextService<
    UpdateCrmChannelConnectionInput,
    CrmChannelConnection
  >;
  updateZapiCredentialsAsSupport: ContextService<
    Parameters<typeof updateZapiCredentialsAsSupport>[1],
    Awaited<ReturnType<typeof updateZapiCredentialsAsSupport>>
  >;
};
