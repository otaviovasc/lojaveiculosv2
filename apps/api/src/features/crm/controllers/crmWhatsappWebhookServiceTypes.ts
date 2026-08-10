import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  ConfigureWhatsappConnectionWebhooksInput,
  ConfigureWhatsappConnectionWebhooksResult,
} from "../../../domains/crm/services/CrmWhatsapp/configureWhatsappConnectionWebhooks.js";
import type {
  IngestZapiWhatsappWebhookInput,
  IngestZapiWhatsappWebhookResult,
} from "../../../domains/crm/services/CrmWhatsapp/ingestZapiWhatsappWebhook.js";
import type {
  ListWhatsappWebhookEventIssuesInput,
  RetryWhatsappWebhookEventInput,
  RetryWhatsappWebhookEventResult,
  WhatsappWebhookEventSummary,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappWebhookEvents.js";
import type { ProcessMetaMessagingWebhookResult } from "../../../domains/crm/services/CrmMessaging/processMetaMessagingWebhook.js";

type CrmContextService<Input, Output> = (
  context: ServiceContext,
  input: Input,
) => Promise<Output>;

export type ZapiWebhookProcessor = CrmContextService<
  IngestZapiWhatsappWebhookInput,
  unknown
>;

export type CrmWhatsappWebhookServices = {
  authorizeZapiWebhook: CrmContextService<
    { connectionId: string; token: string | null },
    { authorized: true; storeId: string; tenantId: string }
  >;
  configureWhatsappConnectionWebhooks: CrmContextService<
    ConfigureWhatsappConnectionWebhooksInput,
    ConfigureWhatsappConnectionWebhooksResult
  >;
  ingestZapiWhatsappWebhook: CrmContextService<
    IngestZapiWhatsappWebhookInput,
    IngestZapiWhatsappWebhookResult
  >;
  listWhatsappWebhookEventIssues: CrmContextService<
    ListWhatsappWebhookEventIssuesInput,
    readonly WhatsappWebhookEventSummary[]
  >;
  processMetaMessagingWebhook: CrmContextService<
    Record<string, unknown>,
    ProcessMetaMessagingWebhookResult
  >;
  processZapiWhatsappChatPresenceWebhook: ZapiWebhookProcessor;
  processZapiWhatsappConnectedWebhook: ZapiWebhookProcessor;
  processZapiWhatsappDeliveryWebhook: ZapiWebhookProcessor;
  processZapiWhatsappDisconnectedWebhook: ZapiWebhookProcessor;
  processZapiWhatsappStatusWebhook: ZapiWebhookProcessor;
  retryWhatsappWebhookEvent: CrmContextService<
    RetryWhatsappWebhookEventInput,
    RetryWhatsappWebhookEventResult
  >;
};
