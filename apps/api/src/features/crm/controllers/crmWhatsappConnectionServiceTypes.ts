import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmBotIntegration } from "../../../domains/crm/ports/crmBotIntegrationRepository.js";
import type { WhatsappConnection } from "../../../domains/crm/services/CrmWhatsapp/listWhatsappConnections.js";
import type { UpdateWhatsappConnectionInput } from "../../../domains/crm/services/CrmWhatsapp/listWhatsappConnections.js";
import type {
  CreateWhatsappConnectionInput,
  WhatsappConnectionOverview,
} from "../../../domains/crm/whatsapp/whatsappConnectionCreation.js";
import type {
  AuthorizeComposioWhatsappInput,
  CompleteComposioWhatsappResult,
  SelectComposioWhatsappSenderInput,
} from "../../../domains/crm/services/CrmWhatsapp/composioWhatsappConnectionSetup.js";
import type {
  RequestZapiPairingCodeInput,
  RequestZapiPairingQrInput,
} from "../../../domains/crm/services/CrmWhatsapp/zapiWhatsappConnectionSetup.js";
import type {
  disconnectZapiConnection,
  refreshZapiConnectionStatus,
} from "../../../domains/crm/services/CrmWhatsapp/zapiConnectionLifecycle.js";
import type { UpdateWhatsappBotIntegrationInput } from "../../../domains/crm/services/CrmWhatsapp/whatsappBotIntegration.js";
import type { archiveAbandonedZapiConnections } from "../../../domains/crm/services/CrmWhatsapp/archiveAbandonedZapiConnections.js";
import type {
  configureZapiWebhooksAsSupport,
  createZapiConnectionAsSupport,
  requestZapiPairingCodeAsSupport,
  requestZapiPairingQrAsSupport,
  updateZapiCredentialsAsSupport,
} from "../../../domains/crm/services/CrmWhatsapp/manageZapiConnectionAsSupport.js";
import type { retryOlxChatSetup } from "../../../domains/crm/services/CrmService/retryOlxChatSetup.js";

type ContextService<Input, Output> = (
  context: ServiceContext,
  input: Input,
) => Promise<Output>;

export type CrmWhatsappConnectionServices = {
  archiveAbandonedZapiConnections: ContextService<
    Parameters<typeof archiveAbandonedZapiConnections>[1],
    Awaited<ReturnType<typeof archiveAbandonedZapiConnections>>
  >;
  authorizeComposioWhatsappConnection: ContextService<
    AuthorizeComposioWhatsappInput,
    { expiresAt: string; redirectUrl: string }
  >;
  completeComposioWhatsappConnection: ContextService<
    AuthorizeComposioWhatsappInput,
    CompleteComposioWhatsappResult
  >;
  configureZapiWebhooksAsSupport: ContextService<
    Parameters<typeof configureZapiWebhooksAsSupport>[1],
    Awaited<ReturnType<typeof configureZapiWebhooksAsSupport>>
  >;
  createZapiConnectionAsSupport: ContextService<
    Parameters<typeof createZapiConnectionAsSupport>[1],
    Awaited<ReturnType<typeof createZapiConnectionAsSupport>>
  >;
  createWhatsappConnection: ContextService<
    CreateWhatsappConnectionInput,
    WhatsappConnection
  >;
  disconnectZapiConnection: ContextService<
    Parameters<typeof disconnectZapiConnection>[1],
    Awaited<ReturnType<typeof disconnectZapiConnection>>
  >;
  getWhatsappBotIntegration: (
    context: ServiceContext,
  ) => Promise<CrmBotIntegration>;
  getWhatsappConnectionOverview: (
    context: ServiceContext,
  ) => Promise<WhatsappConnectionOverview>;
  listWhatsappConnections: (
    context: ServiceContext,
  ) => Promise<readonly WhatsappConnection[]>;
  requestZapiPairingCode: ContextService<
    RequestZapiPairingCodeInput,
    { code?: string; requested: boolean }
  >;
  requestZapiPairingQr: ContextService<
    RequestZapiPairingQrInput,
    { expiresAt: string; qrCode: string }
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
  selectComposioWhatsappSender: ContextService<
    SelectComposioWhatsappSenderInput,
    WhatsappConnection
  >;
  updateWhatsappBotIntegration: ContextService<
    UpdateWhatsappBotIntegrationInput,
    CrmBotIntegration
  >;
  updateWhatsappConnection: ContextService<
    UpdateWhatsappConnectionInput,
    WhatsappConnection
  >;
  updateZapiCredentialsAsSupport: ContextService<
    Parameters<typeof updateZapiCredentialsAsSupport>[1],
    Awaited<ReturnType<typeof updateZapiCredentialsAsSupport>>
  >;
};
