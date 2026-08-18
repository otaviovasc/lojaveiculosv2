import {
  createRuntimeCrmWhatsappProviderGateway,
  isOlxChatRuntimeEnabled,
} from "../crm/crmWhatsappProviderRouter.js";
import { createNoopCrmBotWebhookDispatcher } from "../../domains/crm/ports/crmBotWebhookDispatcher.js";
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

export function createRuntimeCrmServices(
  db: unknown,
  env: Record<string, string | undefined>,
  realtimePublisher?: CrmRealtimePublisher,
  objectStorage?: ObjectStorage | null,
  olxWebhookSecurity?: CrmOlxWebhookSecurity,
): CrmServices {
  const olxChatEnabled = isOlxChatRuntimeEnabled(env);
  return createCrmServices({
    drizzleClient: db as DrizzleCrmClient,
    environment: env.APP_ENV ?? env.NODE_ENV ?? "local",
    ports: {
      ...(olxWebhookSecurity
        ? { crmOlxWebhookSecurity: olxWebhookSecurity }
        : {}),
      crmProviderRuntime: { olxChatEnabled },
      olxCrmCallbackOrigin: readOlxCrmCallbackOrigin(env),
      ...(realtimePublisher ? { crmRealtimePublisher: realtimePublisher } : {}),
      ...(objectStorage ? { crmWhatsappMediaStorage: objectStorage } : {}),
      crmBotWebhookDispatcher: createNoopCrmBotWebhookDispatcher(),
      crmWhatsappMediaFetcher: createSafeCrmRemoteMediaFetcher(),
      crmWhatsappGateway: createRuntimeCrmWhatsappProviderGateway(env),
    },
  });
}
