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
import type { RequestUazapiPairingCodeInput } from "../../../domains/crm/services/CrmWhatsappService/uazapiPairingCode.js";
import type { RequestUazapiPairingQrInput } from "../../../domains/crm/services/CrmWhatsappService/uazapiPairingQr.js";
import type {
  ConfigureUazapiConnectionWebhooksInput,
  ConfigureUazapiConnectionWebhooksResult,
} from "../../../domains/crm/services/CrmWhatsappService/configureUazapiConnectionWebhooks.js";
import type {
  disconnectUazapiConnection,
  refreshUazapiConnectionStatus,
} from "../../../domains/crm/services/CrmWhatsappService/uazapiConnectionLifecycle.js";
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
import type { CrmConnectionMember } from "../../../domains/crm/ports/crmConnectionMemberRepository.js";
import type { GrantConnectionMemberInput } from "../../../domains/crm/services/CrmConnectionMemberService/grantConnectionMember.js";
import type { ListConnectionMembersInput } from "../../../domains/crm/services/CrmConnectionMemberService/listConnectionMembers.js";
import type {
  RevokeConnectionMemberInput,
  RevokeConnectionMemberResult,
} from "../../../domains/crm/services/CrmConnectionMemberService/revokeConnectionMember.js";

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
  configureUazapiConnectionWebhooks: ContextService<
    ConfigureUazapiConnectionWebhooksInput,
    ConfigureUazapiConnectionWebhooksResult
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
  disconnectUazapiConnection: ContextService<
    Parameters<typeof disconnectUazapiConnection>[1],
    Awaited<ReturnType<typeof disconnectUazapiConnection>>
  >;
  getExternalBotConfiguration: (
    context: ServiceContext,
  ) => Promise<CrmExternalBotIntegration>;
  getChannelConnectionOverview: (
    context: ServiceContext,
  ) => Promise<CrmChannelConnectionOverview>;
  grantConnectionMember: ContextService<GrantConnectionMemberInput, void>;
  listConnectionMembers: ContextService<
    ListConnectionMembersInput,
    readonly CrmConnectionMember[]
  >;
  revokeConnectionMember: ContextService<
    RevokeConnectionMemberInput,
    RevokeConnectionMemberResult
  >;
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
  requestUazapiPairingCode: ContextService<
    RequestUazapiPairingCodeInput,
    { code?: string; expiresAt: string; requested: boolean }
  >;
  requestUazapiPairingQr: ContextService<
    RequestUazapiPairingQrInput,
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
  refreshUazapiConnectionStatus: ContextService<
    Parameters<typeof refreshUazapiConnectionStatus>[1],
    Awaited<ReturnType<typeof refreshUazapiConnectionStatus>>
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
