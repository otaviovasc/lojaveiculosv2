import type { CrmScheduledMessage } from "../ports/crmConversationRepository.js";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import {
  getCrmSpecialDateRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { findProcessableCampaignForSchedule } from "./crmCampaignDeliveryMetrics.js";

export type ScheduledMessageBlockedBy = "campaign" | "specialDate";

export type ScheduledMessageReadiness = {
  blocked: true;
  blockedBy: ScheduledMessageBlockedBy;
  pendingDisposition?: "cancel" | "defer";
  reason: string;
};

export async function listEnabledSpecialDateConfigSnapshots(
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  if (!ports.crmSpecialDateRepository) return undefined;
  try {
    const configs = await getCrmSpecialDateRepository(ports).listEnabledConfigs(
      scope.tenantId as TenantId,
      scope.storeId as StoreId,
    );
    return configs.map(({ id, revision }) => ({ id, revision }));
  } catch {
    // Fail closed for special-date work while leaving ordinary schedules
    // eligible for the same sweep.
    return [];
  }
}

/**
 * Returns the enabled special-date revisions for the worker's global due-scope
 * query. Stale pending rows must be filtered before that query's LIMIT, or a
 * revised row can consume a scope slot while evaluation is waiting to replace
 * it. The repository owns active entitlement/provider scope filtering.
 */
export async function listEnabledSpecialDateConfigSnapshotsForAllScopes(
  ports: CrmServicePorts,
) {
  if (!ports.crmSpecialDateRepository) return undefined;
  try {
    const repository = getCrmSpecialDateRepository(ports);
    const snapshots = new Map<string, { id: string; revision: number }>();
    let cursor: string | undefined;
    do {
      const page = await repository.listEnabledConfigScopes({
        ...(cursor ? { cursor } : {}),
        limit: 100,
      });
      for (const scope of page.scopes) {
        const configs = await repository.listEnabledConfigs(
          scope.tenantId,
          scope.storeId,
        );
        for (const config of configs) {
          snapshots.set(config.id, {
            id: config.id,
            revision: config.revision,
          });
        }
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return [...snapshots.values()];
  } catch {
    return [];
  }
}

/**
 * Rechecks mutable automation configuration immediately before dispatch.
 * Metadata on a scheduled row is an immutable snapshot of the configuration
 * that created it; a disabled configuration cancels pending work, while a
 * revised configuration leaves its pending row dormant until evaluation
 * replaces it with the current revision.
 */
export async function findScheduledMessageReadiness(
  scheduled: CrmScheduledMessage,
  ports: CrmServicePorts,
): Promise<ScheduledMessageReadiness | null> {
  const campaign = await findProcessableCampaignForSchedule(scheduled, ports);
  if (campaign?.blocked) {
    return {
      blocked: true,
      blockedBy: "campaign",
      reason:
        "CRM campaign is paused or cancelled; scheduled delivery is blocked.",
    };
  }

  const specialDate = readSpecialDateMetadata(scheduled.metadata);
  if (!specialDate) return null;
  const configs = await getCrmSpecialDateRepository(
    ports,
  ).listConfigsByConnection(
    scheduled.tenantId,
    scheduled.storeId,
    scheduled.connectionId,
  );
  const config = configs.find((item) => item.id === specialDate.configId);
  if (!config?.enabled) {
    return {
      blocked: true,
      blockedBy: "specialDate",
      pendingDisposition: "cancel",
      reason:
        "CRM special-date configuration is disabled; scheduled delivery is blocked.",
    };
  }
  if (config.revision !== specialDate.configRevision) {
    return {
      blocked: true,
      blockedBy: "specialDate",
      pendingDisposition: "defer",
      reason:
        "CRM special-date configuration was revised; scheduled delivery is blocked.",
    };
  }
  return null;
}

function readSpecialDateMetadata(metadata: Record<string, unknown>) {
  const value = metadata.specialDate;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.configId !== "string" ||
    typeof record.configRevision !== "number" ||
    !Number.isSafeInteger(record.configRevision)
  ) {
    return {
      configId: "",
      configRevision: -1,
    };
  }
  return {
    configId: record.configId,
    configRevision: record.configRevision,
  };
}
