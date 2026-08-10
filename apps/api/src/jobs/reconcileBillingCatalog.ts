import * as auditSchema from "@lojaveiculosv2/audit-db";
import * as productSchema from "@lojaveiculosv2/db";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { BillingCatalogActivationAuditInProgressError } from "../domains/billing/catalog/billingCatalogIntegrity.js";
import {
  billingCatalogRegistry,
  currentBillingCatalog,
} from "../domains/billing/catalog/currentBillingCatalog.js";
import type { BillingCatalogDefinition } from "../domains/billing/catalog/billingCatalogDefinition.js";
import { reconcileBillingCatalog } from "../domains/billing/services/BillingCatalogService/reconcileBillingCatalog.js";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "../infrastructure/db/audit/drizzleAuditSink.js";
import type { BillingCatalogDeploymentClient } from "../infrastructure/db/billing/drizzleBillingCatalogDeploymentMapping.js";
import { createDrizzleBillingCatalogDeploymentRepository } from "../infrastructure/db/billing/drizzleBillingCatalogDeploymentRepository.js";
import { findActiveBillingCatalogVersion } from "../infrastructure/db/billing/drizzleActiveBillingCatalog.js";
import {
  createConsoleServiceLogger,
  createServiceContext,
} from "../shared/serviceContext.js";

loadLocalEnv();

async function main(): Promise<void> {
  const productClient = postgres(requireEnv("DATABASE_URL"), { max: 1 });
  const productDb = drizzle(productClient, { schema: productSchema });
  const audit = createAuditResources();
  const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? "local";
  const requestId = `billing_catalog_${currentBillingCatalog.version}_${randomUUID()}`;
  const context = createServiceContext({
    actor: { id: "billing_catalog_deploy", kind: "system" },
    ...(audit ? { audit: audit.sink } : {}),
    auditFailureTier: "required",
    logger: createConsoleServiceLogger(),
    permissions: ["billing.catalog.deploy"],
    request: { correlationId: requestId, requestId },
    source: {
      component: "billing-catalog-deploy",
      environment,
      service: "api",
      version: currentBillingCatalog.version,
    },
  });
  const ports = {
    catalogDeploymentRepository:
      createDrizzleBillingCatalogDeploymentRepository(
        productDb as BillingCatalogDeploymentClient,
      ),
  };

  try {
    const activeVersion = await findActiveBillingCatalogVersion(productDb);
    const activeDefinition = billingCatalogRegistry.find(
      (catalog) => catalog.version === activeVersion,
    );
    if (
      activeDefinition &&
      activeDefinition.version !== currentBillingCatalog.version
    ) {
      await reconcileWithAuditWait(context, activeDefinition, ports);
    }
    await reconcileWithAuditWait(context, currentBillingCatalog, ports);
  } finally {
    await productClient.end();
    await audit?.close();
  }
}

async function reconcileWithAuditWait(
  context: Parameters<typeof reconcileBillingCatalog>[0],
  catalog: BillingCatalogDefinition,
  ports: Parameters<typeof reconcileBillingCatalog>[2],
) {
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    try {
      return await reconcileBillingCatalog(context, { catalog }, ports);
    } catch (error) {
      if (
        !(error instanceof BillingCatalogActivationAuditInProgressError) ||
        attempt === 120
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("Billing catalog audit wait exhausted unexpectedly.");
}

function createAuditResources() {
  const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? "local";
  const url = process.env.AUDIT_DATABASE_URL;
  if (!url || url.startsWith("${{")) {
    if (environment === "local" || environment === "test") return undefined;
    throw new Error(
      "AUDIT_DATABASE_URL must be configured for billing catalog deployment.",
    );
  }
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema: auditSchema });
  return {
    close: () => client.end(),
    sink: createDrizzleAuditSink(db as unknown as DrizzleAuditSinkClient),
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("${{")) {
    throw new Error(`${name} must be configured for billing catalog deploy.`);
  }
  return value;
}

void main();
