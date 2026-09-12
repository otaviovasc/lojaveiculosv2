import { and, eq, getTableColumns, gt, isNull, lte, or } from "drizzle-orm";
import {
  integrationAccounts,
  storeEntitlements,
  stores,
  tenants,
} from "@lojaveiculosv2/db";
import type {
  FindCrmExternalBotIntegrationByApiTokenHashInput,
  FindCrmExternalBotIntegrationBySecretHashInput,
} from "../../../domains/crm/ports/crmExternalBotIntegrationRepository.js";
import { crmExternalBotIntegrationProvider } from "../../../domains/crm/ports/crmExternalBotIntegrationRepository.js";
import {
  readConfig,
  readString,
  toExternalBotIntegration,
  type DrizzleCrmExternalBotIntegrationClient,
} from "./drizzleCrmExternalBotIntegrationShared.js";

export async function findExternalBotIntegrationByApiTokenHash(
  db: DrizzleCrmExternalBotIntegrationClient,
  input: FindCrmExternalBotIntegrationByApiTokenHashInput,
) {
  const rows = await listActiveIntegrationRows(db);
  const matches = rows.filter(
    (item) =>
      readString(readConfig(item.config).externalBotApiBearerHash) ===
      input.apiTokenHash,
  );
  return matches.length === 1 ? toExternalBotIntegration(matches[0]!) : null;
}

export async function findExternalBotIntegrationsBySecretHash(
  db: DrizzleCrmExternalBotIntegrationClient,
  input: FindCrmExternalBotIntegrationBySecretHashInput,
) {
  const rows = await listActiveIntegrationRows(db);
  const matches = rows.filter((item) => {
    const config = readConfig(item.config);
    return (
      readString(config.webhookSecretHash) === input.webhookSecretHash &&
      Boolean(readString(config.webhookSecretSealed))
    );
  });
  return matches.map(toExternalBotIntegration);
}

async function listActiveIntegrationRows(
  db: DrizzleCrmExternalBotIntegrationClient,
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
        eq(storeEntitlements.status, "active"),
        or(
          isNull(storeEntitlements.startsAt),
          lte(storeEntitlements.startsAt, now),
        ),
        or(isNull(storeEntitlements.endsAt), gt(storeEntitlements.endsAt, now)),
      ),
    )
    .where(eq(integrationAccounts.provider, crmExternalBotIntegrationProvider));
  const active = rows.filter((item) => item.status === "active");
  return [...new Map(active.map((row) => [row.id, row])).values()];
}
