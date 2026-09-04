import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmStatisticsSnapshot } from "../../readModels/crmStatisticsReadModel.js";
import {
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";

const permission = "crm.conversations.read";

export type GetCrmStatisticsInput = {
  connectionId?: string;
  from: Date;
  toExclusive: Date;
};

export type GetCrmStatisticsResult = CrmStatisticsSnapshot & {
  period: {
    from: string;
    timezone: "America/Sao_Paulo";
    toExclusive: string;
  };
};

export async function getCrmStatistics(
  context: ServiceContext,
  input: GetCrmStatisticsInput,
  ports: CrmServicePorts,
): Promise<GetCrmStatisticsResult> {
  assertPermission(context, permission);
  const scope = requireCrmMessagingScope(context);
  if (!ports.crmStatisticsReadModel) {
    throw new Error("CRM statistics read model is unavailable.");
  }
  logCrmServiceEvent(context, "crm.statistics.read.started", {
    connectionId: input.connectionId ?? null,
    from: input.from.toISOString(),
    toExclusive: input.toExclusive.toISOString(),
  });
  const statistics = await ports.crmStatisticsReadModel.load({
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    from: input.from,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    toExclusive: input.toExclusive,
  });
  await auditCrmServiceEvent(context, {
    action: "crm.statistics.read",
    category: "data_access",
    metadata: {
      connectionId: input.connectionId ?? null,
      conversations: statistics.summary.conversationsCreated,
      from: input.from.toISOString(),
      toExclusive: input.toExclusive.toISOString(),
    },
    permission,
    summary: "Read CRM operational statistics",
  });
  return {
    ...statistics,
    period: {
      from: input.from.toISOString(),
      timezone: "America/Sao_Paulo",
      toExclusive: input.toExclusive.toISOString(),
    },
  };
}
