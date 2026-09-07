import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  CRM_SPECIAL_DATE_TYPES,
  type CrmSpecialDateType,
} from "../../messaging/crmSpecialDateCalculator.js";
import type { CrmSpecialDateConfig } from "../../ports/crmSpecialDateRepository.js";
import {
  getCrmSpecialDateRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { DEFAULT_SPECIAL_DATE_TEMPLATES } from "../../messaging/crmSpecialDateDefaults.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import {
  requireSpecialDateConnection,
  specialDateConfigPermission,
} from "../../messaging/crmSpecialDateServiceSupport.js";

export type SpecialDateConfigView = {
  connectionId: string;
  dateType: CrmSpecialDateType;
  enabled: boolean;
  id?: string;
  leadDays: number;
  messageTemplate: string;
  revision?: number;
  sendTime: string;
};

export async function getSpecialDateConfigs(
  context: ServiceContext,
  connectionId: string,
  ports: CrmServicePorts,
): Promise<readonly SpecialDateConfigView[]> {
  assertPermission(context, specialDateConfigPermission);
  const { scope } = await requireSpecialDateConnection(
    context,
    connectionId,
    ports,
    {
      requireReady: false,
    },
  );
  const repository = getCrmSpecialDateRepository(ports);

  const existingConfigs = await repository.listConfigsByConnection(
    scope.tenantId,
    scope.storeId,
    connectionId,
  );
  logCrmServiceEvent(context, "crm.special_date.config.list", {
    connectionId,
  });

  const configMap = new Map<string, CrmSpecialDateConfig>();
  for (const config of existingConfigs) {
    configMap.set(config.dateType, config);
  }

  const configs = CRM_SPECIAL_DATE_TYPES.map((dateType) => {
    const existing = configMap.get(dateType);
    if (existing) {
      return {
        connectionId: existing.connectionId,
        dateType: existing.dateType,
        enabled: existing.enabled,
        id: existing.id,
        leadDays: existing.leadDays,
        messageTemplate:
          existing.messageTemplate.trim() ||
          DEFAULT_SPECIAL_DATE_TEMPLATES[dateType],
        ...(existing.revision !== undefined
          ? { revision: existing.revision }
          : {}),
        sendTime: existing.sendTime,
      };
    }

    return {
      connectionId,
      dateType,
      enabled: false,
      leadDays: 0,
      messageTemplate: DEFAULT_SPECIAL_DATE_TEMPLATES[dateType],
      sendTime: "09:00",
    };
  });
  await auditCrmServiceEvent(context, {
    action: "crm.special_date.config.list",
    category: "data_access",
    entityId: connectionId,
    entityType: "crm_special_date_config",
    metadata: { resultCount: configs.length },
    permission: specialDateConfigPermission,
    summary: "Listed CRM special date automation configurations",
  });
  return configs;
}
