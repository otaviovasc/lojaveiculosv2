import type { BillingServicesPorts } from "../../domains/billing/services/BillingService/serviceSupport.js";
import { createBillingServices } from "../../features/billing/controllers/billingServices.js";
import {
  createExternalApiServices,
  type ExternalApiServices,
} from "../../features/externalApi/controllers/externalApiServices.js";
import {
  createRoleServices,
  type RoleServices,
} from "../../features/identity/controllers/roleServices.js";
import {
  createSettingsServices,
  type SettingsServices,
} from "../../features/settings/controllers/settingsServices.js";
import { createAsaasPaymentProviderGateway } from "../billing/asaasPaymentProviderGateway.js";
import { createDrizzleBillingPlanHireRepository } from "./billing/drizzleBillingPlanHireRepository.js";
import { createDrizzleBillingProviderRepository } from "./billing/drizzleBillingProviderRepository.js";
import {
  createDrizzleBillingQuotaGuard,
  type DrizzleBillingQuotaClient,
} from "./billing/drizzleBillingQuotaGuard.js";
import {
  createDrizzleBillingRepository,
  type DrizzleBillingClient,
} from "./billing/drizzleBillingRepository.js";
import { createDrizzleBillingWebhookRepository } from "./billing/drizzleBillingWebhookRepository.js";
import {
  createDrizzleExternalApiRepository,
  type DrizzleExternalApiClient,
} from "./externalApi/drizzleExternalApiRepository.js";
import {
  createDrizzleRoleManagementRepository,
  type DrizzleRoleManagementClient,
} from "./roles/drizzleRoleManagementRepository.js";
import type { DrizzleStoreSettingsClient } from "./settings/drizzleStoreSettingsRepository.js";

export { createBillingServices };
export { createDrizzleBillingQuotaGuard };

export function createRuntimeBillingServicePorts(
  db: unknown,
  env: Record<string, string | undefined>,
): BillingServicesPorts {
  const publicAppUrl = env.PUBLIC_APP_URL?.trim();
  return {
    billingPlanHireRepository: createDrizzleBillingPlanHireRepository(
      db as DrizzleBillingClient,
    ),
    billingProviderRepository: createDrizzleBillingProviderRepository(
      db as DrizzleBillingClient,
    ),
    billingRepository: createDrizzleBillingRepository(
      db as DrizzleBillingClient,
    ),
    billingWebhookRepository: createDrizzleBillingWebhookRepository(
      db as DrizzleBillingClient,
    ),
    environment: env.APP_ENV ?? env.NODE_ENV ?? "production",
    paymentProviderGateway: createAsaasPaymentProviderGateway(env),
    ...(publicAppUrl ? { publicAppUrl } : {}),
  };
}

export function createRuntimeExternalApiServices(
  db: unknown,
): ExternalApiServices {
  return createExternalApiServices({
    drizzleClient: db as DrizzleExternalApiClient,
  });
}

export function createRuntimeSettingsServices(db: unknown): SettingsServices {
  return createSettingsServices({
    drizzleClient: db as DrizzleStoreSettingsClient,
  });
}

export function createRuntimeRoleServices(db: unknown): RoleServices {
  return createRoleServices(
    createDrizzleRoleManagementRepository(
      db as unknown as DrizzleRoleManagementClient,
    ),
  );
}
