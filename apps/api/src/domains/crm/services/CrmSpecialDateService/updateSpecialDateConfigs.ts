import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  CRM_SPECIAL_DATE_TYPES,
  type CrmSpecialDateType,
} from "../../messaging/crmSpecialDateCalculator.js";
import { CrmMessageActionError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmSpecialDateRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { logCrmServiceEvent } from "../CrmMessagingService/serviceSupport.js";
import { assertSchedulingRoute } from "../../messaging/assertSchedulingRoute.js";
import {
  getSpecialDateConfigs,
  type SpecialDateConfigView,
} from "./getSpecialDateConfigs.js";
import {
  requireSpecialDateConnection,
  specialDateConfigPermission,
} from "../../messaging/crmSpecialDateServiceSupport.js";

export type UpdateSpecialDateConfigInput = {
  connectionId: string;
  dateType: CrmSpecialDateType;
  enabled: boolean;
  leadDays: number;
  messageTemplate: string;
  sendTime: string;
};

export type UpdateSpecialDateConfigItem = Omit<
  UpdateSpecialDateConfigInput,
  "connectionId"
>;

export type UpdateSpecialDateConfigsInput = {
  configs: readonly UpdateSpecialDateConfigItem[];
  connectionId: string;
};

export async function updateSpecialDateConfig(
  context: ServiceContext,
  input: UpdateSpecialDateConfigInput,
  ports: CrmServicePorts,
): Promise<SpecialDateConfigView> {
  assertPermission(context, specialDateConfigPermission);
  const { scope } = await requireSpecialDateConnection(
    context,
    input.connectionId,
    ports,
    { requireReady: input.enabled },
  );
  logCrmServiceEvent(context, "crm.special_date.config.update.started", {
    connectionId: input.connectionId,
    dateType: input.dateType,
  });
  validateInput(input);
  if (input.enabled) {
    await assertSchedulingRoute(input.connectionId, scope, ports);
  }
  const repository = getCrmSpecialDateRepository(ports);

  const updated = await repository.upsertConfig({
    connectionId: input.connectionId,
    dateType: input.dateType,
    enabled: input.enabled,
    leadDays: input.leadDays,
    messageTemplate: input.messageTemplate.trim(),
    sendTime: input.sendTime,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  await context.audit.record({
    action: "crm.special_date.config.update",
    actor: context.actor,
    category: "data_change",
    entityId: updated.id,
    entityType: "crm_special_date_config",
    metadata: {
      connectionId: input.connectionId,
      dateType: input.dateType,
      enabled: input.enabled,
      leadDays: input.leadDays,
      messageTemplateLength: input.messageTemplate.trim().length,
      sendTime: input.sendTime,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Updated CRM special date automation configuration",
    tenantId: scope.tenantId,
  });

  const configs = await getSpecialDateConfigs(
    context,
    input.connectionId,
    ports,
  );
  return (
    configs.find((config) => config.dateType === input.dateType) ?? {
      connectionId: updated.connectionId,
      dateType: updated.dateType,
      enabled: updated.enabled,
      id: updated.id,
      leadDays: updated.leadDays,
      messageTemplate: updated.messageTemplate,
      ...(updated.revision !== undefined ? { revision: updated.revision } : {}),
      sendTime: updated.sendTime,
    }
  );
}

/** Internal batch helper for migrations and focused tests. */
export async function updateSpecialDateConfigs(
  context: ServiceContext,
  input: UpdateSpecialDateConfigsInput,
  ports: CrmServicePorts,
): Promise<readonly SpecialDateConfigView[]> {
  for (const config of input.configs) {
    await updateSpecialDateConfig(
      context,
      { ...config, connectionId: input.connectionId },
      ports,
    );
  }
  return getSpecialDateConfigs(context, input.connectionId, ports);
}

function validateInput(input: UpdateSpecialDateConfigInput): void {
  if (!CRM_SPECIAL_DATE_TYPES.includes(input.dateType)) {
    throw new CrmMessageActionError("Unsupported CRM special date type.");
  }
  if (
    !Number.isInteger(input.leadDays) ||
    input.leadDays < 0 ||
    input.leadDays > 30
  ) {
    throw new CrmMessageActionError(
      "leadDays must be an integer from 0 to 30.",
    );
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/u.test(input.sendTime)) {
    throw new CrmMessageActionError("sendTime must use HH:mm format.");
  }
  if (!input.messageTemplate.trim()) {
    throw new CrmMessageActionError("messageTemplate is required.");
  }
  if (input.messageTemplate.trim().length > 1_000) {
    throw new CrmMessageActionError("messageTemplate is too long.");
  }
}
