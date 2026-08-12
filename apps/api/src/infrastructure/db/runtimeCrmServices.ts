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
import type { CredereFinancingServices } from "../../features/financing/controllers/credereFinancingServices.js";
import type { FinancingInquiry } from "../../domains/financing/ports/financingRepository.js";
import type { CrmFinancingBotActions } from "../../domains/crm/ports/crmFinancingBotActions.js";
import type { CrmRealtimePublisher } from "../../domains/crm/ports/crmRealtimePublisher.js";
import type { CrmOlxWebhookSecurity } from "../../domains/crm/ports/crmOlxWebhookSecurity.js";
import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import type { DrizzleCrmClient } from "./crm/drizzleCrmRepository.js";

export function createRuntimeCrmServices(
  db: unknown,
  env: Record<string, string | undefined>,
  realtimePublisher?: CrmRealtimePublisher,
  objectStorage?: ObjectStorage | null,
  financingServices?: CredereFinancingServices,
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
      ...(realtimePublisher ? { crmRealtimePublisher: realtimePublisher } : {}),
      ...(objectStorage ? { crmWhatsappMediaStorage: objectStorage } : {}),
      crmBotWebhookDispatcher: createNoopCrmBotWebhookDispatcher(),
      crmWhatsappMediaFetcher: createSafeCrmRemoteMediaFetcher(),
      crmWhatsappGateway: createRuntimeCrmWhatsappProviderGateway(env),
      ...(financingServices
        ? { financingBotActions: createFinancingBotActions(financingServices) }
        : {}),
    },
  });
}

function createFinancingBotActions(
  services: CredereFinancingServices,
): CrmFinancingBotActions {
  return {
    createSimulation: async (context, input) =>
      toBotSimulation(
        await services.store.createSimulation(context, {
          idempotencyKey: input.idempotencyKey,
          payload: input.payload,
        }),
      ),
    getSimulation: async (context, input) =>
      toBotSimulation(
        input.refresh
          ? await services.store.refreshSimulation(context, {
              inquiryId: input.uuid,
            })
          : await services.store.getSimulation(context, {
              inquiryId: input.uuid,
            }),
      ),
    readiness: async (context) => {
      const status = (await services.store.getStatus(context)) as {
        canCreateSimulation?: boolean;
        usableBankCount?: number;
        usableBanks?: readonly { code: string; name: string | null }[];
      };
      return {
        provider: "credere",
        ready: status.canCreateSimulation === true,
        status: status.canCreateSimulation === true ? "ready" : "unavailable",
        usableBankCount: status.usableBankCount ?? 0,
        usableBanks: status.usableBanks ?? [],
      };
    },
  };
}

function toBotSimulation(value: unknown) {
  const inquiry = value as FinancingInquiry | null;
  return {
    conditions:
      inquiry?.conditions.map((condition) => ({
        available: condition.status === "available",
        bankCode: condition.bankCode,
        bankName: condition.bankName,
        downPaymentCents:
          typeof condition.metadata.downPaymentCents === "number"
            ? condition.metadata.downPaymentCents
            : null,
        financedAmountCents: condition.totalAmountCents,
        firstInstallmentCents:
          typeof condition.metadata.firstInstallmentCents === "number"
            ? condition.metadata.firstInstallmentCents
            : null,
        id: condition.id,
        installments: condition.installments,
        preApprovalStatus: null,
        reason: condition.summary,
        reasonIdentifier:
          typeof condition.metadata.reasonIdentifier === "string"
            ? condition.metadata.reasonIdentifier
            : null,
        status: condition.status as never,
      })) ?? [],
    createdAt: inquiry?.createdAt.toISOString() ?? null,
    providerRequestId: inquiry?.providerRequestId ?? null,
    reason: inquiry?.reason ?? null,
    status: toProviderSimulationStatus(inquiry?.status),
    success: inquiry?.success ?? null,
    uuid: inquiry?.id ?? "",
  };
}

function toProviderSimulationStatus(
  status: FinancingInquiry["status"] | undefined,
) {
  if (status === "completed" || status === "failed") return status;
  return "pending";
}
