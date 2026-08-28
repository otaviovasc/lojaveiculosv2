import type { PermissionKey } from "@lojaveiculosv2/shared";
import { Hono } from "hono";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { resolveCrmWebhookActor } from "../../../infrastructure/http/crmWebhookContextFactory.js";
import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import { createMemoryCrmAssigneeMembershipRepository } from "../adapters/memory/crmAssigneeMembershipRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmVisitRepository } from "../adapters/memory/crmVisitRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmPushRepository } from "../../../domains/crm/testSupportCrmPush.js";
import { createCrmFeature } from "./crm.controller.js";
import { createTestCrmConnectionCredentialVault } from "./crm.channelConnections.testSupport.js";
import { createTestCrmMessagingGateway } from "./crm.messagingGateway.testSupport.js";
import { createCrmServices } from "./crmServices.js";
import type { CreateCrmTestAppOptions } from "./crm.controller.testSupport.types.js";
import {
  createAuditSpy,
  createTestRoutingConnectionRepository,
  createTestRoutingPolicyRepository,
  expectApiError,
} from "./crm.controller.testSupportHelpers.js";
export {
  createAuditSpy,
  expectApiError,
} from "./crm.controller.testSupportHelpers.js";

export const defaultWhatsappPermissions = [
  "crm.conversations.assign",
  "crm.conversations.manage",
  "crm.attendances.manage",
  "crm.messaging.connection.pair",
  "crm.messaging.connection.setup",
  "crm.messaging.credentials.rotate",
  "crm.routing.default.manage",
  "crm.conversations.read",
  "crm.conversations.read",
  "crm.campaigns.manage",
  "crm.campaigns.read",
  "crm.messaging.connection.setup",
  "crm.scheduled_messages.cancel",
  "crm.scheduled_messages.create",
  "crm.scheduled_messages.process",
  "crm.scheduled_messages.read",
  "crm.messages.send",
  "crm.bot.read",
  "crm.bot.manage",
  "crm.bot.proposals.decide",
  "crm.tags.assign",
  "crm.tags.manage",
  "crm.conversations.manage",
  "crm.pipeline.manage",
  "crm.pipeline.move",
  "crm.pipeline.read",
  "crm.visits.manage",
  "crm.visits.read",
] satisfies PermissionKey[];

export function createTestApp(options: CreateCrmTestAppOptions = {}) {
  const app = new Hono();
  const assigneeMembershipRepository =
    createMemoryCrmAssigneeMembershipRepository();
  const routingConnectionRepository =
    options.crmRoutingConnectionRepository ??
    createTestRoutingConnectionRepository(options.crmConnectionRepository);
  const routingPolicyRepository =
    options.crmRoutingPolicyRepository ??
    createTestRoutingPolicyRepository(routingConnectionRepository);
  app.route(
    "/api/v1/crm",
    createCrmFeature({
      accountContextFactory: async () =>
        createServiceContext({
          actor: { id: "platform_support", kind: "user" },
          permissions: options.supportPermissions ?? [],
          request: { requestId: "support_req_1" },
          storeId: null,
          tenantId: null,
        }),
      contextFactory: async () =>
        Object.assign(
          createServiceContext({
            actor: {
              ...(options.actorDisplayName
                ? { displayName: options.actorDisplayName }
                : {}),
              id: "02020202-0202-4202-8202-020202020202",
              kind: "user",
            },
            ...(options.audit ? { audit: options.audit } : {}),
            ...(options.logger ? { logger: options.logger } : {}),
            permissions: options.permissions ?? defaultWhatsappPermissions,
            request: { requestId: "req_1" },
            storeId: "store_1",
            tenantId: "tenant_1",
          }),
          { entitlements: options.entitlements ?? ["crm"] },
        ),
      webhookContextFactory: async (context) => {
        const actor = resolveCrmWebhookActor(new URL(context.req.url).pathname);
        return createServiceContext({
          actor: {
            id: actor.actorId,
            kind: "integration",
            displayName: actor.displayName,
          },
          ...(options.audit ? { audit: options.audit } : {}),
          ...(options.logger ? { logger: options.logger } : {}),
          permissions: ["crm.messages.ingest", "crm.conversations.manage"],
          request: { requestId: "req_1" },
          storeId: null,
          tenantId: null,
        });
      },
      pushPublicConfig: options.pushPublicConfig ?? {
        appId: null,
        deliveryMode: "off",
      },
      services: createCrmServices({
        ports: {
          ...(options.composioChannelOnboardingProvider
            ? {
                composioChannelOnboardingProvider:
                  options.composioChannelOnboardingProvider,
              }
            : {}),
          crmExternalBotIntegrationRepository:
            options.crmExternalBotIntegrationRepository ??
            createMemoryCrmExternalBotIntegrationRepository(),
          crmAssigneeMembershipRepository: assigneeMembershipRepository,
          ...(options.crmCanonicalInboundRepository
            ? {
                crmCanonicalInboundRepository:
                  options.crmCanonicalInboundRepository,
              }
            : {}),
          ...(options.crmConnectionRepository
            ? { crmConnectionRepository: options.crmConnectionRepository }
            : {}),
          ...(options.crmStatisticsReadModel
            ? { crmStatisticsReadModel: options.crmStatisticsReadModel }
            : {}),
          ...(options.crmOlxWebhookSecurity
            ? { crmOlxWebhookSecurity: options.crmOlxWebhookSecurity }
            : {}),
          crmProviderRuntime: {
            olxChatEnabled: options.olxChatEnabled === true,
          },
          olxCrmCallbackOrigin:
            options.olxCrmCallbackOrigin ?? "https://api.example.test",
          ...(options.crmOutcomeRepository
            ? { crmOutcomeRepository: options.crmOutcomeRepository }
            : {}),
          ...(options.olxCrmWebhookSetupProvider
            ? {
                olxCrmWebhookSetupProvider: options.olxCrmWebhookSetupProvider,
              }
            : {}),
          ...(routingConnectionRepository
            ? { crmRoutingConnectionRepository: routingConnectionRepository }
            : {}),
          ...(routingPolicyRepository
            ? { crmRoutingPolicyRepository: routingPolicyRepository }
            : {}),
          ...(options.crmZapiSupportAuthorizer
            ? { crmZapiSupportAuthorizer: options.crmZapiSupportAuthorizer }
            : {}),
          crmConnectionCredentialVault:
            options.crmConnectionCredentialVault ??
            createTestCrmConnectionCredentialVault(),
          ...((options.crmRealtimePublisher ?? options.crmRealtimeBroker)
            ? {
                crmRealtimePublisher:
                  options.crmRealtimePublisher ?? options.crmRealtimeBroker,
              }
            : {}),
          crmPipelineRepository:
            options.crmPipelineRepository ??
            createMemoryCrmPipelineRepository(),
          crmPushRepository:
            options.crmPushRepository ?? createMemoryCrmPushRepository(),
          crmRepository: options.crmRepository ?? createMemoryCrmRepository(),
          crmVisitRepository:
            options.crmVisitRepository ?? createMemoryCrmVisitRepository(),
          ...(options.transaction
            ? {
                transaction: (action) =>
                  options.transaction!(async (transactionPorts) =>
                    action({
                      crmAssigneeMembershipRepository:
                        assigneeMembershipRepository,
                      ...transactionPorts,
                    }),
                  ),
              }
            : {}),
          ...(options.crmConversationRepository
            ? { crmConversationRepository: options.crmConversationRepository }
            : {}),
          ...(options.crmWebhookEventRepository
            ? { crmWebhookEventRepository: options.crmWebhookEventRepository }
            : {}),
          ...(options.crmMessagingGateway
            ? {
                crmMessagingGateway: createTestCrmMessagingGateway(
                  options.crmMessagingGateway,
                ),
              }
            : {}),
          ...(options.crmMediaStorage
            ? { crmMediaStorage: options.crmMediaStorage }
            : {}),
          ...(options.crmMediaFetcher
            ? { crmMediaFetcher: options.crmMediaFetcher }
            : {}),
          ...(options.vehicleInventory
            ? { vehicleInventory: options.vehicleInventory }
            : {}),
          ...(options.zapiConnectionSetupProvider
            ? {
                zapiConnectionSetupProvider:
                  options.zapiConnectionSetupProvider,
              }
            : {}),
        },
      }),
      resolveBotEntitlements:
        options.resolveBotEntitlements ??
        (async () => options.entitlements ?? ["crm"]),
      ...(options.crmRealtimeBroker
        ? { realtimeBroker: options.crmRealtimeBroker }
        : {}),
    }),
  );
  return app;
}
