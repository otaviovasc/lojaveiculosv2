import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createDrizzleBillingQuotaGuard } from "../../../infrastructure/db/billing/drizzleBillingQuotaGuard.js";
import { createDrizzleCrmBotIntegrationRepository } from "../../../infrastructure/db/crm/drizzleCrmBotIntegrationRepository.js";
import { createDrizzleCrmAssigneeMembershipRepository } from "../../../infrastructure/db/crm/drizzleCrmAssigneeMembershipRepository.js";
import { createDrizzleCrmConnectionRepository } from "../../../infrastructure/db/crm/drizzleCrmConnectionRepository.js";
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
import { createDrizzleCrmWhatsappOutboundIntentRepository } from "../../../infrastructure/db/crm/drizzleCrmWhatsappOutboundIntentRepository.js";
import { createDrizzleCrmWhatsappRepository } from "../../../infrastructure/db/crm/drizzleCrmWhatsappRepository.js";
import { createDrizzleCrmWhatsappSessionCommandRepository } from "../../../infrastructure/db/crm/drizzleCrmWhatsappSessionCommandRepository.js";
import {
  createOlxWebhookSecurity,
  CrmOlxWebhookSecurityConfigurationError,
} from "../../../infrastructure/crm/olxWebhookSecurity.js";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmAssigneeMembershipRepository } from "../adapters/memory/crmAssigneeMembershipRepository.js";
import { createMemoryCrmCanonicalInboundRepository } from "../adapters/memory/crmCanonicalInboundRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRoutingRepositories } from "../adapters/memory/crmRoutingRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmOutcomeRepository } from "../adapters/memory/crmOutcomeRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmVisitRepository } from "../adapters/memory/crmVisitRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createMemoryCrmWhatsappOutboundIntentRepository } from "../adapters/memory/crmWhatsappOutboundIntentRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createMemoryCrmWhatsappSessionCommandRepository } from "../adapters/memory/crmWhatsappSessionCommandRepository.js";
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
  const memoryWhatsappRepository =
    options.ports?.crmWhatsappRepository ?? createMemoryCrmWhatsappRepository();
  const defaultPorts = options.drizzleClient
    ? {
        ...connectionSetupPorts,
        billingQuotaGuard: createDrizzleBillingQuotaGuard(
          options.drizzleClient,
        ),
        crmBotIntegrationRepository: createDrizzleCrmBotIntegrationRepository(
          options.drizzleClient,
        ),
        crmAssigneeMembershipRepository:
          createDrizzleCrmAssigneeMembershipRepository(options.drizzleClient),
        crmConnectionRepository: createDrizzleCrmConnectionRepository(
          options.drizzleClient,
        ),
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
        crmRepository: createDrizzleCrmRepository(options.drizzleClient),
        crmVisitRepository: createDrizzleCrmVisitRepository(
          options.drizzleClient,
        ),
        crmWebhookEventRepository: createDrizzleCrmWebhookEventRepository(
          options.drizzleClient,
        ),
        crmWhatsappOutboundIntentRepository:
          createDrizzleCrmWhatsappOutboundIntentRepository(
            options.drizzleClient,
          ),
        crmWhatsappRepository: createDrizzleCrmWhatsappRepository(
          options.drizzleClient,
        ),
        crmWhatsappSessionCommandRepository:
          createDrizzleCrmWhatsappSessionCommandRepository(
            options.drizzleClient,
          ),
        environment,
        vehicleInventory: createCrmVehicleInventoryPorts(options.drizzleClient),
      }
    : {
        ...connectionSetupPorts,
        billingQuotaGuard: {
          assertAvailable: async () => {
            throw new Error("CRM WhatsApp instance allowance is exhausted.");
          },
          getAllowance: async () => ({ limit: 0, remaining: 0, used: 0 }),
        },
        crmBotIntegrationRepository: createMemoryCrmBotIntegrationRepository(),
        crmAssigneeMembershipRepository:
          createMemoryCrmAssigneeMembershipRepository(),
        crmCanonicalInboundRepository:
          createMemoryCrmCanonicalInboundRepository(memoryWhatsappRepository),
        crmConnectionRepository: memoryConnections,
        crmRoutingConnectionRepository:
          memoryConnections.routingConnectionRepository,
        crmRoutingPolicyRepository: memoryRouting.policyRepository,
        crmOlxWebhookSecurity,
        crmOutcomeRepository: createMemoryCrmOutcomeRepository(),
        crmPipelineRepository: createMemoryCrmPipelineRepository(),
        crmRepository: createMemoryCrmRepository(),
        crmVisitRepository: createMemoryCrmVisitRepository(),
        crmWebhookEventRepository: createMemoryCrmWebhookEventRepository(),
        crmWhatsappOutboundIntentRepository:
          createMemoryCrmWhatsappOutboundIntentRepository(),
        crmWhatsappRepository: memoryWhatsappRepository,
        crmWhatsappSessionCommandRepository:
          createMemoryCrmWhatsappSessionCommandRepository(),
        environment,
      };
  const ports = { ...defaultPorts, ...(options.ports ?? {}) };
  if (options.drizzleClient && !ports.transaction) {
    ports.transaction = async (action) =>
      options.drizzleClient!.transaction(async (tx) => {
        const { transaction: _transaction, ...transactionPorts } = ports;
        return action({
          ...transactionPorts,
          billingQuotaGuard: createDrizzleBillingQuotaGuard(
            tx as DrizzleCrmClient,
          ),
          crmBotIntegrationRepository: createDrizzleCrmBotIntegrationRepository(
            tx as DrizzleCrmClient,
          ),
          crmAssigneeMembershipRepository:
            createDrizzleCrmAssigneeMembershipRepository(
              tx as DrizzleCrmClient,
            ),
          crmConnectionRepository: createDrizzleCrmConnectionRepository(
            tx as DrizzleCrmClient,
          ),
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
          crmRepository: createDrizzleCrmRepository(tx as DrizzleCrmClient),
          crmVisitRepository: createDrizzleCrmVisitRepository(
            tx as DrizzleCrmClient,
          ),
          crmWebhookEventRepository: createDrizzleCrmWebhookEventRepository(
            tx as DrizzleCrmClient,
          ),
          crmWhatsappOutboundIntentRepository:
            createDrizzleCrmWhatsappOutboundIntentRepository(
              tx as DrizzleCrmClient,
            ),
          crmWhatsappRepository: createDrizzleCrmWhatsappRepository(
            tx as DrizzleCrmClient,
            { disableTransactions: true },
          ),
          crmWhatsappSessionCommandRepository:
            createDrizzleCrmWhatsappSessionCommandRepository(
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
    "Shared OLX webhook rate limiting must be configured outside local/test.",
  );
}
