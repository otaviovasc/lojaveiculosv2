import { and, eq } from "drizzle-orm";
import {
  crmSpecialDateConfigs,
  type crmSpecialDateExecutions,
} from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmSpecialDateConfig } from "../../../domains/crm/ports/crmSpecialDateRepository.js";
import type { CrmSpecialDateType } from "../../../domains/crm/messaging/crmSpecialDateCalculator.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export type SpecialDateExecutionRow =
  typeof crmSpecialDateExecutions.$inferSelect;

export function withSpecialDateTransaction<T>(
  db: DrizzleCrmClient,
  disableTransactions: boolean,
  action: (client: DrizzleCrmClient) => Promise<T>,
) {
  return disableTransactions
    ? action(db)
    : db.transaction((tx) => action(tx as DrizzleCrmClient));
}

export function specialDateScope(
  tenantId: TenantId,
  storeId: StoreId,
  connectionId: string,
  dateType: CrmSpecialDateType,
) {
  return and(
    eq(crmSpecialDateConfigs.tenantId, tenantId),
    eq(crmSpecialDateConfigs.storeId, storeId),
    eq(crmSpecialDateConfigs.connectionId, connectionId),
    eq(crmSpecialDateConfigs.dateType, dateType),
  );
}

export function toSpecialDateConfig(
  row: typeof crmSpecialDateConfigs.$inferSelect,
): CrmSpecialDateConfig {
  return {
    connectionId: row.connectionId,
    createdAt: row.createdAt,
    dateType: row.dateType,
    enabled: row.enabled,
    id: row.id,
    leadDays: row.leadDays,
    messageTemplate: row.messageTemplate,
    revision: row.revision,
    sendTime: row.sendTime,
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    updatedAt: row.updatedAt,
  };
}

export function canonicalRecipientKey(key: string, phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `phone:${digits}` : key.trim();
}
