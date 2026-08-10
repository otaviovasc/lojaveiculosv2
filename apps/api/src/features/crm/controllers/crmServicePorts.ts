import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createDrizzleBillingQuotaGuard } from "../../../infrastructure/db/billing/drizzleBillingQuotaGuard.js";
import { createDrizzleCrmBotIntegrationRepository } from "../../../infrastructure/db/crm/drizzleCrmBotIntegrationRepository.js";
import { createDrizzleCrmConnectionRepository } from "../../../infrastructure/db/crm/drizzleCrmConnectionRepository.js";
import { createDrizzleCrmPipelineRepository } from "../../../infrastructure/db/crm/drizzleCrmPipelineRepository.js";
import {
  createDrizzleCrmRepository,
  type DrizzleCrmClient,
} from "../../../infrastructure/db/crm/drizzleCrmRepository.js";
import { createDrizzleCrmVisitRepository } from "../../../infrastructure/db/crm/drizzleCrmVisitRepository.js";
import { createDrizzleCrmWebhookEventRepository } from "../../../infrastructure/db/crm/drizzleCrmWebhookEventRepository.js";
import { createDrizzleCrmWhatsappOutboundIntentRepository } from "../../../infrastructure/db/crm/drizzleCrmWhatsappOutboundIntentRepository.js";
import { createDrizzleCrmWhatsappRepository } from "../../../infrastructure/db/crm/drizzleCrmWhatsappRepository.js";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmVisitRepository } from "../adapters/memory/crmVisitRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createMemoryCrmWhatsappOutboundIntentRepository } from "../adapters/memory/crmWhatsappOutboundIntentRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createCrmConnectionSetupPorts } from "./crmConnectionSetupPorts.js";
import type { CreateCrmServicesOptions } from "./crmServices.types.js";
import { createCrmVehicleInventoryPorts } from "./crmVehicleInventoryPorts.js";

export function resolveCrmPorts(
  options: CreateCrmServicesOptions,
): CrmServicePorts {
  const connectionSetupPorts = createCrmConnectionSetupPorts(
    options.drizzleClient,
  );
  const defaultPorts = options.drizzleClient
    ? {
        ...connectionSetupPorts,
        billingQuotaGuard: createDrizzleBillingQuotaGuard(
          options.drizzleClient,
        ),
        crmBotIntegrationRepository: createDrizzleCrmBotIntegrationRepository(
          options.drizzleClient,
        ),
        crmConnectionRepository: createDrizzleCrmConnectionRepository(
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
        environment: options.environment ?? "local",
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
        crmConnectionRepository: createMemoryCrmConnectionRepository(),
        crmPipelineRepository: createMemoryCrmPipelineRepository(),
        crmRepository: createMemoryCrmRepository(),
        crmVisitRepository: createMemoryCrmVisitRepository(),
        crmWebhookEventRepository: createMemoryCrmWebhookEventRepository(),
        crmWhatsappOutboundIntentRepository:
          createMemoryCrmWhatsappOutboundIntentRepository(),
        crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
        environment: options.environment ?? "test",
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
          crmConnectionRepository: createDrizzleCrmConnectionRepository(
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
          vehicleInventory: createCrmVehicleInventoryPorts(
            tx as DrizzleCrmClient,
          ),
        });
      });
  }
  return ports;
}
