import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  ConfigureCrmChannelConnectionWebhooksInput,
  ConfigureCrmChannelConnectionWebhooksResult,
} from "../../../domains/crm/services/CrmWhatsappService/configureWhatsappConnectionWebhooks.js";
import type {
  IngestZapiWhatsappWebhookInput,
  IngestZapiWhatsappWebhookResult,
} from "../../../domains/crm/services/CrmWhatsappService/ingestZapiWhatsappWebhook.js";
import type {
  ListProviderEventIssuesInput,
  RetryProviderEventInput,
  RetryProviderEventResult,
  ProviderEventIssueSummary,
} from "../../../domains/crm/services/CrmMessagingService/providerEventIssues.js";
import type { ProcessMetaMessagingWebhookResult } from "../../../domains/crm/services/CrmMessagingService/processMetaMessagingWebhook.js";
import type { IngestOlxChatWebhookResult } from "../../../domains/crm/services/CrmMessagingService/ingestOlxChatWebhook.js";
import type { IngestOlxLeadWebhookResult } from "../../../domains/crm/services/CrmMessagingService/ingestOlxLeadWebhook.js";
import type { OlxWebhookAuthorization } from "../../../domains/crm/services/CrmMessagingService/authorizeOlxChatWebhook.js";
import type { IngestUazapiWhatsappWebhookResult } from "../../../domains/crm/services/CrmWhatsappService/ingestUazapiWhatsappWebhook.js";
import type { UazapiWebhookResult } from "../../../domains/crm/services/CrmWhatsappService/uazapiWebhookSupport.js";

type CrmContextService<Input, Output> = (
  context: ServiceContext,
  input: Input,
) => Promise<Output>;

export type ZapiWebhookProcessor = CrmContextService<
  IngestZapiWhatsappWebhookInput,
  unknown
>;

export type UazapiWebhookProcessor = CrmContextService<
  { connectionId: string; payload: Record<string, unknown> },
  IngestUazapiWhatsappWebhookResult | UazapiWebhookResult
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
    { connectionId: string; sourceFingerprint: string; token: string | null },
    { authorized: true; storeId: string; tenantId: string }
  >;
  authorizeUazapiWebhook: CrmContextService<
    { connectionId: string; sourceFingerprint: string; token: string | null },
    { authorized: true; storeId: string; tenantId: string }
  >;
  configureWhatsappConnectionWebhooks: CrmContextService<
    ConfigureCrmChannelConnectionWebhooksInput,
    ConfigureCrmChannelConnectionWebhooksResult
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
  listProviderEventIssues: CrmContextService<
    ListProviderEventIssuesInput,
    readonly ProviderEventIssueSummary[]
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
  ingestUazapiWhatsappWebhook: UazapiWebhookProcessor;
  processUazapiWhatsappConnectionWebhook: UazapiWebhookProcessor;
  processUazapiWhatsappStatusWebhook: UazapiWebhookProcessor;
  retryProviderEvent: CrmContextService<
    RetryProviderEventInput,
    RetryProviderEventResult
  >;
};
