import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import { createMemoryCrmAssigneeMembershipRepository } from "../adapters/memory/crmAssigneeMembershipRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmVisitRepository } from "../adapters/memory/crmVisitRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmPushRepository } from "../../../domains/crm/testSupportCrmPush.js";
import { createTestCrmConnectionCredentialVault } from "./crm.channelConnections.testSupport.js";
import { createTestCrmMessagingGateway } from "./crm.messagingGateway.testSupport.js";
import type { CreateCrmServicesOptions } from "./crmServices.types.js";
import type { CreateCrmTestAppOptions } from "./crm.controller.testSupport.types.js";
import {
  createTestRoutingConnectionRepository,
  createTestRoutingPolicyRepository,
} from "./crm.controller.testSupportHelpers.js";

type TestCrmServicePorts = NonNullable<CreateCrmServicesOptions["ports"]>;

export function buildTestCrmServicePorts(
  options: CreateCrmTestAppOptions,
): NonNullable<CreateCrmServicesOptions["ports"]> {
  const assigneeMembershipRepository =
    createMemoryCrmAssigneeMembershipRepository();
  const routingConnectionRepository =
    options.crmRoutingConnectionRepository ??
    createTestRoutingConnectionRepository(options.crmConnectionRepository);
  const routingPolicyRepository =
    options.crmRoutingPolicyRepository ??
    createTestRoutingPolicyRepository(routingConnectionRepository);
  const ports = {
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
          crmCanonicalInboundRepository: options.crmCanonicalInboundRepository,
        }
      : {}),
    ...(options.crmConnectionRepository
      ? { crmConnectionRepository: options.crmConnectionRepository }
      : {}),
    ...(options.crmConnectionMemberRepository
      ? {
          crmConnectionMemberRepository: options.crmConnectionMemberRepository,
        }
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
      options.crmPipelineRepository ?? createMemoryCrmPipelineRepository(),
    crmPushRepository:
      options.crmPushRepository ?? createMemoryCrmPushRepository(),
    crmRepository: options.crmRepository ?? createMemoryCrmRepository(),
    crmVisitRepository:
      options.crmVisitRepository ?? createMemoryCrmVisitRepository(),
    ...(options.transaction
      ? {
          transaction: ((action) =>
            options.transaction!(async (transactionPorts) =>
              action({
                crmAssigneeMembershipRepository: assigneeMembershipRepository,
                ...transactionPorts,
              }),
            )) satisfies TestCrmServicePorts["transaction"],
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
    ...(options.crmAudioNormalizer
      ? { crmAudioNormalizer: options.crmAudioNormalizer }
      : {}),
    ...(options.crmMediaFetcher
      ? { crmMediaFetcher: options.crmMediaFetcher }
      : {}),
    ...(options.vehicleInventory
      ? { vehicleInventory: options.vehicleInventory }
      : {}),
    ...(options.zapiConnectionSetupProvider
      ? {
          zapiConnectionSetupProvider: options.zapiConnectionSetupProvider,
        }
      : {}),
    ...(options.uazapiConnectionSetupProvider
      ? {
          uazapiConnectionSetupProvider: options.uazapiConnectionSetupProvider,
        }
      : {}),
    ...(options.crmUazapiProvisioningProvider
      ? {
          crmUazapiProvisioningProvider: options.crmUazapiProvisioningProvider,
        }
      : {}),
  };
  return ports;
}
