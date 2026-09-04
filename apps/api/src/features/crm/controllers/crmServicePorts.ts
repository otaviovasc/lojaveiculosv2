import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createDrizzleCrmExternalBotIntegrationRepository } from "../../../infrastructure/db/crm/drizzleCrmExternalBotIntegrationRepository.js";
import { createDrizzleCrmAssigneeMembershipRepository } from "../../../infrastructure/db/crm/drizzleCrmAssigneeMembershipRepository.js";
import { createDrizzleCrmConnectionRepository } from "../../../infrastructure/db/crm/drizzleCrmConnectionRepository.js";
import { createDrizzleCrmConnectionMemberRepository } from "../../../infrastructure/db/crm/drizzleCrmConnectionMemberRepository.js";
import {
  createDrizzleCrmRoutingConnectionRepository,
  createDrizzleCrmRoutingPolicyRepository,
} from "../../../infrastructure/db/crm/drizzleCrmRoutingRepository.js";
import { createDrizzleCrmCanonicalInboundRepository } from "../../../infrastructure/db/crm/drizzleCrmCanonicalInbound.js";
import { createDrizzleCrmPipelineRepository } from "../../../infrastructure/db/crm/drizzleCrmPipelineRepository.js";
import { createDrizzleCrmOutcomeRepository } from "../../../infrastructure/db/crm/drizzleCrmOutcomeRepository.js";
import {
  createDrizzleCrmRepository,
  type DrizzleCrmClient,
} from "../../../infrastructure/db/crm/drizzleCrmRepository.js";
import { createDrizzleCrmVisitRepository } from "../../../infrastructure/db/crm/drizzleCrmVisitRepository.js";
import { createDrizzleCrmWebhookEventRepository } from "../../../infrastructure/db/crm/drizzleCrmWebhookEventRepository.js";
import { createDrizzleCrmOutboundIntentRepository } from "../../../infrastructure/db/crm/drizzleCrmOutboundIntentRepository.js";
import { createDrizzleCrmConversationRepository } from "../../../infrastructure/db/crm/drizzleCrmConversationRepository.js";
import { createDrizzleCrmConversationCycleCommandRepository } from "../../../infrastructure/db/crm/drizzleCrmConversationCycleCommandRepository.js";
import { createDrizzleCrmPushRepository } from "../../../infrastructure/db/crm/drizzleCrmPushRepository.js";
import { createDrizzleCrmStatisticsReadModel } from "../../../infrastructure/db/crm/drizzleCrmStatisticsReadModel.js";
import { emptyCrmStatisticsSnapshot } from "../../../domains/crm/readModels/crmStatisticsReadModel.js";
import {
  createOlxWebhookSecurity,
  CrmOlxWebhookSecurityConfigurationError,
} from "../../../infrastructure/crm/olxWebhookSecurity.js";
import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import { createMemoryCrmAssigneeMembershipRepository } from "../adapters/memory/crmAssigneeMembershipRepository.js";
import { createMemoryCrmCanonicalInboundRepository } from "../adapters/memory/crmCanonicalInboundRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConnectionMemberRepository } from "../adapters/memory/crmConnectionMemberRepository.js";
import { createMemoryCrmRoutingRepositories } from "../adapters/memory/crmRoutingRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmOutcomeRepository } from "../adapters/memory/crmOutcomeRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmVisitRepository } from "../adapters/memory/crmVisitRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createMemoryCrmOutboundIntentRepository } from "../adapters/memory/crmOutboundIntentRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createMemoryCrmConversationCycleCommandRepository } from "../adapters/memory/crmConversationCycleCommandRepository.js";
import { createCrmConnectionSetupPorts } from "./crmConnectionSetupPorts.js";
import type { CreateCrmServicesOptions } from "./crmServices.types.js";
import { createCrmVehicleInventoryPorts } from "./crmVehicleInventoryPorts.js";

export function resolveCrmPorts(
  options: CreateCrmServicesOptions,
): CrmServicePorts {
  const environment =
    options.environment ?? (options.drizzleClient ? "local" : "test");
  const crmOlxWebhookSecurity =
    options.ports?.crmOlxWebhookSecurity ??
    createAllowedInMemoryOlxWebhookSecurity(environment);
  const connectionSetupPorts = createCrmConnectionSetupPorts(
    options.drizzleClient,
  );
  const memoryConnections = createMemoryCrmConnectionRepository();
  const memoryRouting = createMemoryCrmRoutingRepositories();
  const memoryConversationRepository =
    options.ports?.crmConversationRepository ??
    createMemoryCrmConversationRepository();
  const defaultPorts = options.drizzleClient
    ? {
        ...connectionSetupPorts,
        crmExternalBotIntegrationRepository:
          createDrizzleCrmExternalBotIntegrationRepository(
            options.drizzleClient,
          ),
        crmAssigneeMembershipRepository:
          createDrizzleCrmAssigneeMembershipRepository(options.drizzleClient),
        crmConnectionRepository: createDrizzleCrmConnectionRepository(
          options.drizzleClient,
        ),
        crmConnectionMemberRepository:
          createDrizzleCrmConnectionMemberRepository(options.drizzleClient),
        crmRoutingConnectionRepository:
          createDrizzleCrmRoutingConnectionRepository(options.drizzleClient),
        crmRoutingPolicyRepository: createDrizzleCrmRoutingPolicyRepository(
          options.drizzleClient,
        ),
        crmCanonicalInboundRepository:
          createDrizzleCrmCanonicalInboundRepository(options.drizzleClient),
        crmOlxWebhookSecurity,
        crmOutcomeRepository: createDrizzleCrmOutcomeRepository(
          options.drizzleClient,
        ),
        crmPipelineRepository: createDrizzleCrmPipelineRepository(
          options.drizzleClient,
        ),
        crmPushRepository: createDrizzleCrmPushRepository(
          options.drizzleClient,
        ),
        crmRepository: createDrizzleCrmRepository(options.drizzleClient),
        crmVisitRepository: createDrizzleCrmVisitRepository(
          options.drizzleClient,
        ),
        crmWebhookEventRepository: createDrizzleCrmWebhookEventRepository(
          options.drizzleClient,
        ),
        crmOutboundIntentRepository: createDrizzleCrmOutboundIntentRepository(
          options.drizzleClient,
        ),
        crmConversationRepository: createDrizzleCrmConversationRepository(
          options.drizzleClient,
        ),
        crmConversationCycleCommandRepository:
          createDrizzleCrmConversationCycleCommandRepository(
            options.drizzleClient,
          ),
        crmStatisticsReadModel: createDrizzleCrmStatisticsReadModel(
          options.drizzleClient,
        ),
        environment,
        vehicleInventory: createCrmVehicleInventoryPorts(options.drizzleClient),
      }
    : {
        ...connectionSetupPorts,
        crmExternalBotIntegrationRepository:
          createMemoryCrmExternalBotIntegrationRepository(),
        crmAssigneeMembershipRepository:
          createMemoryCrmAssigneeMembershipRepository(),
        crmCanonicalInboundRepository:
          createMemoryCrmCanonicalInboundRepository(
            memoryConversationRepository,
          ),
        crmConnectionRepository: memoryConnections,
        crmConnectionMemberRepository:
          createMemoryCrmConnectionMemberRepository(),
        crmRoutingConnectionRepository:
          memoryConnections.routingConnectionRepository,
        crmRoutingPolicyRepository: memoryRouting.policyRepository,
        crmOlxWebhookSecurity,
        crmOutcomeRepository: createMemoryCrmOutcomeRepository(),
        crmPipelineRepository: createMemoryCrmPipelineRepository(),
        crmRepository: createMemoryCrmRepository(),
        crmVisitRepository: createMemoryCrmVisitRepository(),
        crmWebhookEventRepository: createMemoryCrmWebhookEventRepository(),
        crmOutboundIntentRepository: createMemoryCrmOutboundIntentRepository(),
        crmConversationRepository: memoryConversationRepository,
        crmConversationCycleCommandRepository:
          createMemoryCrmConversationCycleCommandRepository(),
        crmStatisticsReadModel: {
          load: async () => emptyCrmStatisticsSnapshot(),
        },
        environment,
      };
  const ports = { ...defaultPorts, ...(options.ports ?? {}) };
  if (options.drizzleClient && !ports.transaction) {
    ports.transaction = async (action) =>
      options.drizzleClient!.transaction(async (tx) => {
        const { transaction: _transaction, ...transactionPorts } = ports;
        return action({
          ...transactionPorts,
          crmExternalBotIntegrationRepository:
            createDrizzleCrmExternalBotIntegrationRepository(
              tx as DrizzleCrmClient,
            ),
          crmAssigneeMembershipRepository:
            createDrizzleCrmAssigneeMembershipRepository(
              tx as DrizzleCrmClient,
            ),
          crmConnectionRepository: createDrizzleCrmConnectionRepository(
            tx as DrizzleCrmClient,
          ),
          crmConnectionMemberRepository:
            createDrizzleCrmConnectionMemberRepository(tx as DrizzleCrmClient),
          crmRoutingConnectionRepository:
            createDrizzleCrmRoutingConnectionRepository(tx as DrizzleCrmClient),
          crmRoutingPolicyRepository: createDrizzleCrmRoutingPolicyRepository(
            tx as DrizzleCrmClient,
          ),
          crmCanonicalInboundRepository:
            createDrizzleCrmCanonicalInboundRepository(tx as DrizzleCrmClient),
          crmOutcomeRepository: createDrizzleCrmOutcomeRepository(
            tx as DrizzleCrmClient,
          ),
          crmPipelineRepository: createDrizzleCrmPipelineRepository(
            tx as DrizzleCrmClient,
          ),
          crmPushRepository: createDrizzleCrmPushRepository(
            tx as DrizzleCrmClient,
          ),
          crmRepository: createDrizzleCrmRepository(tx as DrizzleCrmClient),
          crmVisitRepository: createDrizzleCrmVisitRepository(
            tx as DrizzleCrmClient,
          ),
          crmWebhookEventRepository: createDrizzleCrmWebhookEventRepository(
            tx as DrizzleCrmClient,
          ),
          crmOutboundIntentRepository: createDrizzleCrmOutboundIntentRepository(
            tx as DrizzleCrmClient,
          ),
          crmConversationRepository: createDrizzleCrmConversationRepository(
            tx as DrizzleCrmClient,
            { disableTransactions: true },
          ),
          crmConversationCycleCommandRepository:
            createDrizzleCrmConversationCycleCommandRepository(
              tx as DrizzleCrmClient,
            ),
          crmStatisticsReadModel: createDrizzleCrmStatisticsReadModel(
            tx as DrizzleCrmClient,
          ),
          vehicleInventory: createCrmVehicleInventoryPorts(
            tx as DrizzleCrmClient,
          ),
        });
      });
  }
  return ports;
}

function createAllowedInMemoryOlxWebhookSecurity(environment: string) {
  if (environment === "local" || environment === "test") {
    return createOlxWebhookSecurity();
  }
  throw new CrmOlxWebhookSecurityConfigurationError(
    "Shared CRM provider webhook rate limiting must be configured outside local/test.",
  );
}
