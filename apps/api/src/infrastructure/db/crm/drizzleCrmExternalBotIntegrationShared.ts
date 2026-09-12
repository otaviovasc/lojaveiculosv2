import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { integrationAccounts } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type { CrmExternalBotIntegration } from "../../../domains/crm/ports/crmExternalBotIntegrationRepository.js";

export type DrizzleCrmExternalBotIntegrationClient = PostgresJsDatabase<
  typeof schema
>;

export type ExternalBotIntegrationRow = typeof integrationAccounts.$inferSelect;

export type ExternalBotIntegrationConfig = {
  enabled?: unknown;
  externalBotApiBearerHash?: unknown;
  secretUpdatedAt?: unknown;
  webhookSecretHash?: unknown;
  webhookSecretSealed?: unknown;
  webhookUrl?: unknown;
};

export function toExternalBotIntegration(
  row: ExternalBotIntegrationRow,
): CrmExternalBotIntegration {
  const config = readConfig(row.config);
  const secretHash = readString(config.webhookSecretHash);
  const secretSealed = readString(config.webhookSecretSealed);
  return {
    apiTokenConfigured: Boolean(readString(config.externalBotApiBearerHash)),
    createdAt: row.createdAt,
    enabled: readBoolean(config.enabled) ?? row.status === "active",
    id: row.id,
    secretConfigured: Boolean(secretHash && secretSealed),
    secretUpdatedAt: readDate(config.secretUpdatedAt),
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    updatedAt: row.updatedAt,
    webhookUrl: readString(config.webhookUrl),
  };
}

export function readConfig(value: unknown): ExternalBotIntegrationConfig {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ExternalBotIntegrationConfig)
    : {};
}

export function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

export function readDate(value: unknown) {
  const text = readString(value);
  return text ? new Date(text) : null;
}

export function readString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
