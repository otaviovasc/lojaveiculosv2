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
import type { IngestOlxChatWebhookResult } from "../../../domains/crm/services/CrmMessaging/ingestOlxChatWebhook.js";
import type { IngestOlxLeadWebhookResult } from "../../../domains/crm/services/CrmMessaging/ingestOlxLeadWebhook.js";
import type { OlxWebhookAuthorization } from "../../../domains/crm/services/CrmMessaging/authorizeOlxChatWebhook.js";

type CrmContextService<Input, Output> = (
  context: ServiceContext,
  input: Input,
) => Promise<Output>;

export type ZapiWebhookProcessor = CrmContextService<
  IngestZapiWhatsappWebhookInput,
  unknown
>;

export type CrmWhatsappWebhookServices = {
  authorizeOlxChatWebhook: CrmContextService<
    {
      connectionId: string;
      sourceFingerprint: string;
      token: string | null;
    },
    {
      authorization: OlxWebhookAuthorization;
      authorized: true;
      storeId: string;
      tenantId: string;
    }
  >;
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
  ingestOlxChatWebhook: CrmContextService<
    {
      authorization: OlxWebhookAuthorization;
      connectionId: string;
      entitlementGranted: boolean;
      payload: Record<string, unknown>;
    },
    IngestOlxChatWebhookResult
  >;
  ingestOlxLeadWebhook: CrmContextService<
    {
      authorization: OlxWebhookAuthorization;
      connectionId: string;
      entitlementGranted: boolean;
      payload: Record<string, unknown>;
    },
    IngestOlxLeadWebhookResult
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
