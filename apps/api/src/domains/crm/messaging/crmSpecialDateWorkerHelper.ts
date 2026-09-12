import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  assertEntitlement,
  assertPermission,
} from "../../../shared/authorization.js";
import {
  evaluateStoreSpecialDates,
  type EvaluateStoreSpecialDatesResult,
} from "../services/CrmSpecialDateService/evaluateStoreSpecialDates.js";
import type { CrmServicePorts } from "../services/CrmService/types.js";
import { getCrmSpecialDateRepository } from "../services/CrmService/serviceSupport.js";
import type {
  CrmSpecialDateConfigScope,
  CrmSpecialDateConfigScopePage,
} from "../ports/crmSpecialDateRepository.js";

export type SpecialDateConfigScope = CrmSpecialDateConfigScope;

export type EvaluateConfiguredSpecialDatesInput = {
  limit?: number;
  referenceDate?: Date;
};

export type EvaluateConfiguredSpecialDatesResult = {
  evaluatedConfigs: number;
  scheduledMessages: number;
  scopes: number;
};

/**
 * Scheduled job entrypoint for evaluating and queueing special date messages.
 * Designed to be invoked daily (e.g. at 06:00 UTC) across stores.
 */
export async function runStoreSpecialDatesEvaluation(
  context: ServiceContext,
  ports: CrmServicePorts,
  referenceDate?: Date,
): Promise<EvaluateStoreSpecialDatesResult> {
  return evaluateStoreSpecialDates(context, ports, referenceDate);
}

/**
 * Evaluates every store that has an enabled special-date configuration. The
 * repository owns the scoped query and may return cursor pages; keeping that
 * discovery behind this helper lets the existing scheduler process config-only
 * stores that have no due scheduled message yet.
 */
export async function runConfiguredSpecialDatesEvaluation(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: EvaluateConfiguredSpecialDatesInput = {},
): Promise<EvaluateConfiguredSpecialDatesResult> {
  assertPermission(context, "crm.scheduled_messages.process");
  assertEntitlement(context, "crm");
  const scopes = await listConfiguredSpecialDateScopes(
    context,
    ports,
    input.limit,
  );
  let evaluatedConfigs = 0;
  let scheduledMessages = 0;
  for (const scope of scopes) {
    const scopedContext: ServiceContext = {
      ...context,
      entitlements: context.entitlements ?? ["crm"],
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    };
    const result = await runStoreSpecialDatesEvaluation(
      scopedContext,
      ports,
      input.referenceDate,
    );
    evaluatedConfigs += result.evaluatedConfigs;
    scheduledMessages += result.scheduledMessages;
  }
  return { evaluatedConfigs, scheduledMessages, scopes: scopes.length };
}

export async function listConfiguredSpecialDateScopes(
  context: ServiceContext,
  ports: CrmServicePorts,
  limit = 100,
): Promise<readonly SpecialDateConfigScope[]> {
  assertPermission(context, "crm.scheduled_messages.process");
  assertEntitlement(context, "crm");
  const repository = getCrmSpecialDateRepository(ports);

  const pageSize = Math.max(1, Math.min(100, Math.trunc(limit)));
  const result: SpecialDateConfigScope[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const page: CrmSpecialDateConfigScopePage =
      await repository.listEnabledConfigScopes({
        ...(cursor ? { cursor } : {}),
        limit: pageSize,
      });
    const scopes = page.scopes;
    for (const scope of scopes) {
      if (!scope.storeId || !scope.tenantId) continue;
      const key = `${scope.tenantId}:${scope.storeId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(scope);
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return result;
}
