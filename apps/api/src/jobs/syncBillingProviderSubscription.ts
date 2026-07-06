import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { syncBillingProviderSubscription } from "../domains/billing/services/BillingService/syncBillingProviderSubscription.js";
import type { PaymentProviderBillingType } from "../domains/billing/ports/paymentProviderGateway.js";
import { createAsaasPaymentProviderGateway } from "../infrastructure/billing/asaasPaymentProviderGateway.js";
import {
  createDrizzleBillingRepository,
  type DrizzleBillingClient,
} from "../infrastructure/db/billing/drizzleBillingRepository.js";
import { createDrizzleBillingProviderRepository } from "../infrastructure/db/billing/drizzleBillingProviderRepository.js";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import {
  createConsoleServiceLogger,
  createServiceContext,
} from "../shared/serviceContext.js";

loadLocalEnv();

const defaultStoreId = "66666666-6666-4666-8666-666666666666";
const defaultTenantId = "77777777-7777-4777-8777-777777777777";
const billingTypes = ["BOLETO", "CREDIT_CARD", "PIX", "UNDEFINED"] as const;

async function main(): Promise<void> {
  const sql = postgres(requireEnv("DATABASE_URL"), { max: 2 });
  const db = drizzle(sql, { schema: productSchema }) as DrizzleBillingClient;

  try {
    const storeId = process.env.BILLING_SYNC_STORE_ID ?? defaultStoreId;
    const tenantId = process.env.BILLING_SYNC_TENANT_ID ?? defaultTenantId;
    const result = await syncBillingProviderSubscription(
      createServiceContext({
        actor: { id: "billing_provider_sync_smoke", kind: "system" },
        logger: createConsoleServiceLogger(),
        permissions: ["billing.manage"],
        request: { requestId: `billing_provider_sync_${Date.now()}` },
        source: { component: "billing-provider-sync-smoke", service: "api" },
        storeId,
        tenantId,
      }),
      {
        billingType: parseBillingType(),
        nextDueDate: parseNextDueDate(),
        updatePendingPayments: true,
      },
      {
        billingProviderRepository: createDrizzleBillingProviderRepository(db),
        billingRepository: createDrizzleBillingRepository(db),
        environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "local",
        paymentProviderGateway: createAsaasPaymentProviderGateway(process.env),
      },
    );

    console.log(
      JSON.stringify(
        {
          billingType: result.billingType,
          chargeTotalCents: result.chargeTotalCents,
          nextDueDate: result.nextDueDate,
          provider: result.provider,
          providerCustomerId: maskProviderId(result.providerCustomerId),
          providerSubscriptionId: maskProviderId(result.providerSubscriptionId),
          status: result.status,
          subscriptionId: result.subscriptionId,
        },
        null,
        2,
      ),
    );
  } finally {
    await sql.end();
  }
}

function parseBillingType(): PaymentProviderBillingType {
  const value = process.env.ASAAS_BILLING_SYNC_TYPE ?? "PIX";
  if (billingTypes.includes(value as PaymentProviderBillingType)) {
    return value as PaymentProviderBillingType;
  }
  throw new Error(`ASAAS_BILLING_SYNC_TYPE is invalid: ${value}`);
}

function parseNextDueDate(): Date {
  const configured = process.env.ASAAS_BILLING_SYNC_NEXT_DUE_DATE;
  if (configured) return new Date(`${configured}T00:00:00.000Z`);
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function maskProviderId(value: string): string {
  if (value.length <= 10) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

void main();
