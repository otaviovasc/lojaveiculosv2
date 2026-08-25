import {
  createRuntimeCrmMessagingProviderGateway,
  isOlxChatRuntimeEnabled,
} from "../crm/crmMessagingProviderRouter.js";
import type { ExternalBotManagerPorts } from "../../domains/crm/bot/ports/externalBotPorts.js";
import { createSafeCrmRemoteMediaFetcher } from "../crm/safeCrmRemoteMediaFetcher.js";
import {
  createCrmServices,
  type CrmServices,
} from "../../features/crm/controllers/crmServices.js";
import type { CrmRealtimePublisher } from "../../domains/crm/ports/crmRealtimePublisher.js";
import type { CrmOlxWebhookSecurity } from "../../domains/crm/ports/crmOlxWebhookSecurity.js";
import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import type { DrizzleCrmClient } from "./crm/drizzleCrmRepository.js";
import { readOlxCrmCallbackOrigin } from "../crm/olxCrmCallbackOrigin.js";
import {
  createOneSignalHttpClient,
  createShadowCrmPushDeliveryProvider,
} from "../crm/onesignalHttpClient.js";
import { readCrmPushRuntimeConfig } from "../crm/push/crmPushRuntimeConfig.js";

export function createRuntimeCrmServices(
  db: unknown,
  env: Record<string, string | undefined>,
  realtimePublisher?: CrmRealtimePublisher,
  objectStorage?: ObjectStorage | null,
  olxWebhookSecurity?: CrmOlxWebhookSecurity,
  externalBotManager?: ExternalBotManagerPorts,
): CrmServices {
  const olxChatEnabled = isOlxChatRuntimeEnabled(env);
  const pushConfig = readCrmPushRuntimeConfig(env);
  const crmPushDeliveryProvider =
    pushConfig.deliveryMode === "live"
      ? createOneSignalHttpClient({
          apiKey: pushConfig.apiKey!,
          appId: pushConfig.appId!,
          requestTimeoutMs: pushConfig.requestTimeoutMs,
        })
      : pushConfig.deliveryMode === "shadow"
        ? createShadowCrmPushDeliveryProvider()
        : null;
  return createCrmServices({
    drizzleClient: db as DrizzleCrmClient,
    environment: env.APP_ENV ?? env.NODE_ENV ?? "local",
    ports: {
      ...(olxWebhookSecurity
        ? { crmOlxWebhookSecurity: olxWebhookSecurity }
        : {}),
      crmProviderRuntime: { olxChatEnabled },
      ...(crmPushDeliveryProvider ? { crmPushDeliveryProvider } : {}),
      olxCrmCallbackOrigin: readOlxCrmCallbackOrigin(env),
      ...(realtimePublisher ? { crmRealtimePublisher: realtimePublisher } : {}),
      ...(objectStorage ? { crmMediaStorage: objectStorage } : {}),
      ...(externalBotManager ? { externalBotManager } : {}),
      crmMediaFetcher: createSafeCrmRemoteMediaFetcher(),
      crmMessagingGateway: createRuntimeCrmMessagingProviderGateway(env),
    },
  });
}
