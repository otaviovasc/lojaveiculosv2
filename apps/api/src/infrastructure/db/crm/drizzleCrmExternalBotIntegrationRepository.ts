import { and, eq } from "drizzle-orm";
import { integrationAccounts } from "@lojaveiculosv2/db";
import type {
  CrmExternalBotIntegrationRepository,
  FindCrmExternalBotIntegrationInput,
  UpsertCrmExternalBotIntegrationInput,
} from "../../../domains/crm/ports/crmExternalBotIntegrationRepository.js";
import { crmExternalBotIntegrationProvider } from "../../../domains/crm/ports/crmExternalBotIntegrationRepository.js";
import {
  findExternalBotIntegrationByApiTokenHash,
  findExternalBotIntegrationsBySecretHash,
} from "./drizzleCrmExternalBotIntegrationQueries.js";
import {
  readBoolean,
  readConfig,
  readString,
  toExternalBotIntegration,
  type DrizzleCrmExternalBotIntegrationClient,
  type ExternalBotIntegrationConfig,
} from "./drizzleCrmExternalBotIntegrationShared.js";

export type { DrizzleCrmExternalBotIntegrationClient };

export function createDrizzleCrmExternalBotIntegrationRepository(
  db: DrizzleCrmExternalBotIntegrationClient,
): CrmExternalBotIntegrationRepository {
  return {
    findExternalBotIntegration: (input) =>
      findExternalBotIntegration(db, input),
    findExternalBotIntegrationByApiTokenHash: (input) =>
      findExternalBotIntegrationByApiTokenHash(db, input),
    findExternalBotIntegrationsBySecretHash: (input) =>
      findExternalBotIntegrationsBySecretHash(db, input),
    findExternalBotIntegrationDeliveryConfig: (input) =>
      findExternalBotIntegrationDeliveryConfig(db, input),
    upsertExternalBotIntegration: (input) =>
      upsertExternalBotIntegration(db, input),
  };
}

async function findExternalBotIntegration(
  db: DrizzleCrmExternalBotIntegrationClient,
  input: FindCrmExternalBotIntegrationInput,
) {
  const row = await findRow(db, input);
  return row ? toExternalBotIntegration(row) : null;
}

async function findExternalBotIntegrationDeliveryConfig(
  db: DrizzleCrmExternalBotIntegrationClient,
  input: FindCrmExternalBotIntegrationInput,
) {
  const row = await findRow(db, input);
  if (!row) return null;
  const config = readConfig(row.config);
  return {
    enabled: readBoolean(config.enabled) ?? row.status === "active",
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    webhookSecretSealed: readString(config.webhookSecretSealed),
    webhookUrl: readString(config.webhookUrl),
  };
}

async function upsertExternalBotIntegration(
  db: DrizzleCrmExternalBotIntegrationClient,
  input: UpsertCrmExternalBotIntegrationInput,
) {
  const current = await findRow(db, input);
  const currentConfig = readConfig(current?.config);
  const apiBearerHash =
    input.apiTokenHash === undefined
      ? readString(currentConfig.externalBotApiBearerHash)
      : input.apiTokenHash;
  const secretHash =
    input.webhookSecretHash === undefined
      ? readString(currentConfig.webhookSecretHash)
      : input.webhookSecretHash;
  const secretSealed =
    input.webhookSecretSealed === undefined
      ? readString(currentConfig.webhookSecretSealed)
      : input.webhookSecretSealed;
  const config = {
    enabled: input.enabled,
    externalBotApiBearerHash: apiBearerHash,
    secretUpdatedAt: readSecretUpdatedAt(input, currentConfig),
    webhookSecretHash: secretHash,
    webhookSecretSealed: secretSealed,
    webhookUrl: input.webhookUrl,
  };
  const [row] = await db
    .insert(integrationAccounts)
    .values({
      config,
      provider: crmExternalBotIntegrationProvider,
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
  return toExternalBotIntegration(row);
}

async function findRow(
  db: DrizzleCrmExternalBotIntegrationClient,
  input: FindCrmExternalBotIntegrationInput,
) {
  const [row] = await db
    .select()
    .from(integrationAccounts)
    .where(
      and(
        eq(integrationAccounts.provider, crmExternalBotIntegrationProvider),
        eq(integrationAccounts.storeId, input.storeId),
        eq(integrationAccounts.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row ?? null;
}

function readSecretUpdatedAt(
  input: UpsertCrmExternalBotIntegrationInput,
  currentConfig: ExternalBotIntegrationConfig,
) {
  if (input.webhookSecretHash === undefined) {
    return readString(currentConfig.secretUpdatedAt);
  }
  return input.secretUpdatedAt?.toISOString() ?? null;
}
