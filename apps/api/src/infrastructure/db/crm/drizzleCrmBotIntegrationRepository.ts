import { and, eq, getTableColumns, gt, isNull, lte, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  integrationAccounts,
  storeEntitlements,
  stores,
  tenants,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  CrmBotIntegration,
  CrmBotIntegrationRepository,
  FindCrmBotIntegrationBySecretHashInput,
  FindCrmBotIntegrationInput,
  UpsertCrmBotIntegrationInput,
} from "../../../domains/crm/ports/crmBotIntegrationRepository.js";
import { crmBotIntegrationProvider } from "../../../domains/crm/ports/crmBotIntegrationRepository.js";

export type DrizzleCrmBotIntegrationClient = PostgresJsDatabase<typeof schema>;

type BotIntegrationConfig = {
  enabled?: unknown;
  secretUpdatedAt?: unknown;
  webhookSecretHash?: unknown;
  webhookSecretValue?: unknown;
  webhookUrl?: unknown;
};

export function createDrizzleCrmBotIntegrationRepository(
  db: DrizzleCrmBotIntegrationClient,
): CrmBotIntegrationRepository {
  return {
    findBotIntegration: (input) => findBotIntegration(db, input),
    findBotIntegrationBySecretHash: (input) =>
      findBotIntegrationBySecretHash(db, input),
    findBotIntegrationDeliveryConfig: (input) =>
      findBotIntegrationDeliveryConfig(db, input),
    upsertBotIntegration: (input) => upsertBotIntegration(db, input),
  };
}

async function findBotIntegration(
  db: DrizzleCrmBotIntegrationClient,
  input: FindCrmBotIntegrationInput,
) {
  const row = await findRow(db, input);
  return row ? toBotIntegration(row) : null;
}

async function findBotIntegrationBySecretHash(
  db: DrizzleCrmBotIntegrationClient,
  input: FindCrmBotIntegrationBySecretHashInput,
) {
  const now = new Date();
  const rows = await db
    .select(getTableColumns(integrationAccounts))
    .from(integrationAccounts)
    .innerJoin(
      stores,
      and(
        eq(stores.id, integrationAccounts.storeId),
        eq(stores.tenantId, integrationAccounts.tenantId),
        eq(stores.isDeleted, false),
        isNull(stores.deletedAt),
      ),
    )
    .innerJoin(
      tenants,
      and(
        eq(tenants.id, integrationAccounts.tenantId),
        eq(tenants.isDeleted, false),
        isNull(tenants.deletedAt),
      ),
    )
    .innerJoin(
      storeEntitlements,
      and(
        eq(storeEntitlements.storeId, integrationAccounts.storeId),
        eq(storeEntitlements.tenantId, integrationAccounts.tenantId),
        eq(storeEntitlements.featureKey, "crm"),
        or(
          eq(storeEntitlements.status, "active"),
          eq(storeEntitlements.status, "trialing"),
        ),
        or(
          isNull(storeEntitlements.startsAt),
          lte(storeEntitlements.startsAt, now),
        ),
        or(isNull(storeEntitlements.endsAt), gt(storeEntitlements.endsAt, now)),
      ),
    )
    .where(eq(integrationAccounts.provider, crmBotIntegrationProvider));
  const row = rows.find((item) => {
    const config = readConfig(item.config);
    return (
      item.status === "active" &&
      readString(config.webhookSecretHash) === input.webhookSecretHash
    );
  });
  return row ? toBotIntegration(row) : null;
}

async function findBotIntegrationDeliveryConfig(
  db: DrizzleCrmBotIntegrationClient,
  input: FindCrmBotIntegrationInput,
) {
  const row = await findRow(db, input);
  if (!row) return null;
  const config = readConfig(row.config);
  return {
    enabled: readBoolean(config.enabled) ?? row.status === "active",
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    webhookSecret: readString(config.webhookSecretValue),
    webhookUrl: readString(config.webhookUrl),
  };
}

async function upsertBotIntegration(
  db: DrizzleCrmBotIntegrationClient,
  input: UpsertCrmBotIntegrationInput,
) {
  const current = await findRow(db, input);
  const currentConfig = readConfig(current?.config);
  const secretHash =
    input.webhookSecretHash === undefined
      ? readString(currentConfig.webhookSecretHash)
      : input.webhookSecretHash;
  const secretValue =
    input.webhookSecretValue === undefined
      ? readString(currentConfig.webhookSecretValue)
      : input.webhookSecretValue;
  const config = {
    enabled: input.enabled,
    secretUpdatedAt: readSecretUpdatedAt(input, currentConfig),
    webhookSecretHash: secretHash,
    webhookSecretValue: secretValue,
    webhookUrl: input.webhookUrl,
  };
  const [row] = await db
    .insert(integrationAccounts)
    .values({
      config,
      provider: crmBotIntegrationProvider,
      status: input.enabled ? "active" : "inactive",
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoUpdate({
      set: {
        config,
        status: input.enabled ? "active" : "inactive",
      },
      target: [integrationAccounts.storeId, integrationAccounts.provider],
    })
    .returning();
  if (!row) throw new Error("CRM bot integration upsert failed.");
  return toBotIntegration(row);
}

async function findRow(
  db: DrizzleCrmBotIntegrationClient,
  input: FindCrmBotIntegrationInput,
) {
  const [row] = await db
    .select()
    .from(integrationAccounts)
    .where(
      and(
        eq(integrationAccounts.provider, crmBotIntegrationProvider),
        eq(integrationAccounts.storeId, input.storeId),
        eq(integrationAccounts.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row ?? null;
}

function toBotIntegration(
  row: typeof integrationAccounts.$inferSelect,
): CrmBotIntegration {
  const config = readConfig(row.config);
  const secretHash = readString(config.webhookSecretHash);
  return {
    createdAt: row.createdAt,
    enabled: readBoolean(config.enabled) ?? row.status === "active",
    id: row.id,
    secretConfigured: Boolean(secretHash),
    secretUpdatedAt: readDate(config.secretUpdatedAt),
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    updatedAt: row.updatedAt,
    webhookUrl: readString(config.webhookUrl),
  };
}

function readSecretUpdatedAt(
  input: UpsertCrmBotIntegrationInput,
  currentConfig: BotIntegrationConfig,
) {
  if (input.webhookSecretHash === undefined) {
    return readString(currentConfig.secretUpdatedAt);
  }
  return input.secretUpdatedAt?.toISOString() ?? null;
}

function readConfig(value: unknown): BotIntegrationConfig {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as BotIntegrationConfig)
    : {};
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readDate(value: unknown) {
  const text = readString(value);
  return text ? new Date(text) : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
