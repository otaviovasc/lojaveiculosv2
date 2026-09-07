import { and, eq } from "drizzle-orm";
import { crmSpecialDateExecutions } from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmSpecialDateType } from "../../../domains/crm/messaging/crmSpecialDateCalculator.js";
import type { CrmSpecialDateRepository } from "../../../domains/crm/ports/crmSpecialDateRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  cancelPendingInTransaction,
  listConfigsByConnection,
  listEnabledConfigs,
  upsertConfig,
} from "./drizzleCrmSpecialDateConfig.js";
import {
  findAnniversaryRecipients,
  findAudienceRecipients,
  findBirthdayRecipients,
} from "./drizzleCrmSpecialDateRecipients.js";
import { listEnabledConfigScopes } from "./drizzleCrmSpecialDateScopes.js";
import { scheduleSpecialDateAtomic } from "./drizzleCrmSpecialDateScheduling.js";
import { withSpecialDateTransaction } from "./drizzleCrmSpecialDateSupport.js";

export type DrizzleSpecialDateRepositoryOptions = {
  disableTransactions?: boolean;
};

export function createDrizzleCrmSpecialDateRepository(
  db: DrizzleCrmClient,
  options: DrizzleSpecialDateRepositoryOptions = {},
): CrmSpecialDateRepository {
  const disableTransactions = options.disableTransactions === true;
  return {
    async cancelPendingSpecialDateExecutions(
      tenantId: TenantId,
      storeId: StoreId,
      connectionId: string,
      dateType: CrmSpecialDateType,
    ) {
      return withSpecialDateTransaction(db, disableTransactions, (tx) =>
        cancelPendingInTransaction(tx, {
          connectionId,
          dateType,
          storeId,
          tenantId,
        }),
      );
    },
    findAnniversaryRecipients: (tenantId, storeId) =>
      findAnniversaryRecipients(db, tenantId, storeId),
    findAudienceRecipients: (tenantId, storeId) =>
      findAudienceRecipients(db, tenantId, storeId),
    findBirthdayRecipients: (tenantId, storeId) =>
      findBirthdayRecipients(db, tenantId, storeId),
    listConfigsByConnection: (tenantId, storeId, connectionId) =>
      listConfigsByConnection(db, tenantId, storeId, connectionId),
    listEnabledConfigs: (tenantId, storeId) =>
      listEnabledConfigs(db, tenantId, storeId),
    listEnabledConfigScopes: (input) => listEnabledConfigScopes(db, input),
    scheduleSpecialDateAtomic: (input) =>
      scheduleSpecialDateAtomic(db, input, disableTransactions),
    upsertConfig: (input) => upsertConfig(db, input, disableTransactions),
  };
}

export async function readSpecialDateExecution(
  db: DrizzleCrmClient,
  input: {
    connectionId: string;
    dateType: CrmSpecialDateType;
    recipientKey: string;
    storeId: StoreId;
    targetYear: number;
    tenantId: TenantId;
  },
) {
  const [row] = await db
    .select()
    .from(crmSpecialDateExecutions)
    .where(
      and(
        eq(crmSpecialDateExecutions.tenantId, input.tenantId),
        eq(crmSpecialDateExecutions.storeId, input.storeId),
        eq(crmSpecialDateExecutions.connectionId, input.connectionId),
        eq(crmSpecialDateExecutions.dateType, input.dateType),
        eq(crmSpecialDateExecutions.targetYear, input.targetYear),
        eq(crmSpecialDateExecutions.recipientKey, input.recipientKey),
      ),
    )
    .limit(1);
  return row ?? null;
}
