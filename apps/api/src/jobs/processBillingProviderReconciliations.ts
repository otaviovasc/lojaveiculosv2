import { randomUUID } from "node:crypto";
import * as auditSchema from "@lojaveiculosv2/audit-db";
import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { reconcileNextBillingProvider } from "../domains/billing/services/BillingService/reconcileBillingProvider.js";
import { createAsaasPaymentProviderGateway } from "../infrastructure/billing/asaasPaymentProviderGateway.js";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "../infrastructure/db/audit/drizzleAuditSink.js";
import { createDrizzleBillingProviderReconciliationRepository } from "../infrastructure/db/billing/drizzleBillingProviderReconciliation.js";
import { createDrizzleBillingProviderRepository } from "../infrastructure/db/billing/drizzleBillingProviderRepository.js";
import {
  createDrizzleBillingRepository,
  type DrizzleBillingClient,
} from "../infrastructure/db/billing/drizzleBillingRepository.js";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import {
  createConsoleServiceLogger,
  createServiceContext,
} from "../shared/serviceContext.js";

loadLocalEnv();

const logger = createConsoleServiceLogger({
  component: "job.billing-provider-reconciliation",
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  service: "api",
});

async function main() {
  const sql = postgres(requireEnv("DATABASE_URL"), { max: 2 });
  const db = drizzle(sql, { schema: productSchema }) as DrizzleBillingClient;
  const audit = createAuditSink();
  const ports = {
    billingProviderReconciliationRepository:
      createDrizzleBillingProviderReconciliationRepository(db),
    billingProviderRepository: createDrizzleBillingProviderRepository(db),
    billingRepository: createDrizzleBillingRepository(db),
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "local",
    paymentProviderGateway: createAsaasPaymentProviderGateway(process.env),
  };
  let processed = 0;
  try {
    while (processed < 50) {
      const result = await reconcileNextBillingProvider(
        createServiceContext({
          actor: { id: "billing_provider_reconciliation", kind: "system" },
          ...(audit ? { audit: audit.sink } : {}),
          logger,
          permissions: ["billing.manage"],
          request: { requestId: `billing_reconcile_${randomUUID()}` },
          source: {
            component: "billing-provider-reconciliation",
            service: "api",
          },
        }),
        { now: new Date(), processingToken: randomUUID() },
        ports,
      );
      if (result.status === "idle") break;
      processed += 1;
    }
    logger.info("job.billing_provider_reconciliation.completed", { processed });
  } finally {
    await sql.end();
    await audit?.close();
  }
}

function createAuditSink() {
  const url = process.env.AUDIT_DATABASE_URL;
  if (!url) return undefined;
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema: auditSchema });
  return {
    close: () => client.end(),
    sink: createDrizzleAuditSink(db as unknown as DrizzleAuditSinkClient),
  };
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

void main().catch((error) => {
  logger.error("job.billing_provider_reconciliation.failed", {
    errorMessage: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : "Error",
  });
  process.exitCode = 1;
});
