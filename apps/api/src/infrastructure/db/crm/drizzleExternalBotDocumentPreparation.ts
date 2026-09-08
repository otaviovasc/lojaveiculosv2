import { sql } from "drizzle-orm";
import type { AuditSink } from "@lojaveiculosv2/audit";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { ExternalBotEvent } from "../../../domains/crm/bot/externalBotModels.js";
import type { ExternalBotEventPreparer } from "../../../domains/crm/bot/ports/externalBotEventPreparation.js";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import { prepareExternalBotDocument } from "../../../domains/crm/bot/services/ExternalBotManagerService/prepareExternalBotDocument.js";
import type { CrmMessagingGateway } from "../../../domains/crm/ports/crmMessagingGateway.js";
import type { CrmRemoteMediaFetcher } from "../../../domains/crm/ports/crmRemoteMediaFetcher.js";
import {
  createServiceContext,
  type ServiceLogger,
} from "../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import { createDrizzleCrmConnectionRepository } from "./drizzleCrmConnectionRepository.js";
import { createDrizzleCrmConversationRepository } from "./drizzleCrmConversationRepository.js";
import { createDrizzleCrmExternalBotIntegrationRepository } from "./drizzleCrmExternalBotIntegrationRepository.js";
import type { ExternalBotDb } from "./drizzleExternalBotShared.js";

export function createDrizzleExternalBotDocumentPreparer(input: {
  db: ExternalBotDb;
  manager: ExternalBotManagerPorts;
  audit: AuditSink;
  logger: ServiceLogger;
  storage: ObjectStorage | null;
  gateway: CrmMessagingGateway;
  fetcher: CrmRemoteMediaFetcher;
}): ExternalBotEventPreparer {
  const messages = createDrizzleCrmConversationRepository(input.db);
  const connections = createDrizzleCrmConnectionRepository(input.db);
  const integrations = createDrizzleCrmExternalBotIntegrationRepository(
    input.db,
  );
  const scopeFor = (event: ExternalBotEvent) => ({
    storeId: event.storeId as StoreId,
    tenantId: event.tenantId as TenantId,
  });
  return (event) =>
    prepareExternalBotDocument(
      createServiceContext({
        actor: { id: "external-bot-event-worker", kind: "system" },
        audit: input.audit,
        logger: input.logger,
        permissions: ["crm.bot.events.publish"],
        request: { requestId: event.id },
        ...scopeFor(event),
      }),
      event,
      {
        storage: input.storage,
        gateway: input.gateway,
        fetcher: input.fetcher,
        authorize: async (current) => {
          const integration = await integrations.findExternalBotIntegration(
            scopeFor(current),
          );
          if (!integration?.enabled || integration.id !== current.integrationId)
            return false;
          const authorization =
            await input.manager.effectAuthorizer.inspect(current);
          if (!authorization.scopeExists || authorization.humanAttendanceActive)
            return false;
          return !(await input.manager.killSwitches.resolve(
            current,
            "conversation.summarize",
            current.actionClass === "proposal" ? "proposal" : "effect",
          ));
        },
        load: async (current) => {
          if (!current.payload.messageRef) return null;
          const rows = await input.db.execute(sql`select id from crm_messages
        where id=${current.payload.messageRef}::uuid and tenant_id=${current.tenantId}::uuid
          and store_id=${current.storeId}::uuid and thread_id=${current.threadId}::uuid
          and provider_connection_id=${current.connectionId}::uuid and provider=${current.provider}
          and deleted_at is null limit 1`);
          if (!rows.length) return null;
          const message = await messages.findMessageById({
            ...scopeFor(current),
            messageId: current.payload.messageRef,
          });
          const connection = await connections.findConnectionById(
            current.connectionId,
          );
          return message && connection ? { message, connection } : null;
        },
        save: async (current, update) => {
          const rows = await input.db.execute(sql`update crm_messages
        set media_url=${update.mediaUrl}, metadata=metadata || ${JSON.stringify({ media: update.metadata.media })}::jsonb,
          updated_at=now()
        where id=${current.payload.messageRef}::uuid and tenant_id=${current.tenantId}::uuid
          and store_id=${current.storeId}::uuid and thread_id=${current.threadId}::uuid
          and provider_connection_id=${current.connectionId}::uuid and provider=${current.provider}
          and deleted_at is null returning id`);
          return rows.length === 1;
        },
      },
    );
}
