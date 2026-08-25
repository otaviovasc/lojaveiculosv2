import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmPushSettings,
  CrmPushSubscriptionRegistrationResult,
} from "../../ports/crmPushRepository.js";
import {
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import {
  getCrmPushRepository,
  normalizeCrmPushSubscriptionId,
  requireCrmPushUser,
} from "./serviceSupport.js";

const permission = "crm.conversations.read";

export async function getCrmPushSettings(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<CrmPushSettings> {
  assertPermission(context, permission);
  const scope = requireCrmMessagingScope(context);
  const userId = requireCrmPushUser(context);
  const settings = await getCrmPushRepository(ports).getSettings({
    ...scope,
    userId,
  });
  await auditCrmServiceEvent(context, {
    action: "crm.push.settings.read",
    category: "data_access",
    entityId: userId,
    entityType: "user",
    metadata: {
      preferenceEnabled: settings.preferenceEnabled,
      subscriptionEnabled: settings.subscription?.enabled ?? false,
    },
    permission,
    summary: "Read own CRM push settings",
  });
  return settings;
}

export async function registerCrmPushSubscription(
  context: ServiceContext,
  input: { subscriptionId: string },
  ports: CrmServicePorts,
): Promise<CrmPushSubscriptionRegistrationResult> {
  assertPermission(context, permission);
  requireCrmMessagingScope(context);
  const userId = requireCrmPushUser(context);
  const subscriptionId = normalizeCrmPushSubscriptionId(input.subscriptionId);
  logCrmServiceEvent(context, "crm.push.subscription.register.started");
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.push.subscription.register",
      category: "data_change",
      entityId: userId,
      entityType: "user",
      permission,
      summary: "Registered own CRM push subscription",
    },
    () =>
      getCrmPushRepository(ports).registerOrTransferSubscription({
        now: new Date(),
        subscriptionId,
        userId,
      }),
    (result) => ({
      created: result.created,
      ownershipTransferred: result.transferredFromUserId !== null,
    }),
  );
}

export async function disableCrmPushSubscription(
  context: ServiceContext,
  input: { subscriptionId: string },
  ports: CrmServicePorts,
): Promise<{ disabled: boolean }> {
  assertPermission(context, permission);
  requireCrmMessagingScope(context);
  const userId = requireCrmPushUser(context);
  const subscriptionId = normalizeCrmPushSubscriptionId(input.subscriptionId);
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.push.subscription.disable",
      category: "data_change",
      entityId: userId,
      entityType: "user",
      permission,
      summary: "Disabled own CRM push subscription",
    },
    async () => ({
      disabled: await getCrmPushRepository(ports).disableSubscription({
        subscriptionId,
        userId,
      }),
    }),
    (result) => result,
  );
}

export async function setOwnCrmPushPreference(
  context: ServiceContext,
  input: { enabled: boolean },
  ports: CrmServicePorts,
): Promise<void> {
  assertPermission(context, permission);
  const scope = requireCrmMessagingScope(context);
  const userId = requireCrmPushUser(context);
  await recordCrmServiceMutation(
    context,
    {
      action: "crm.push.preference.update",
      category: "data_change",
      entityId: userId,
      entityType: "user",
      metadata: { enabled: input.enabled },
      permission,
      summary: "Updated own CRM push preference",
    },
    () =>
      getCrmPushRepository(ports).setPreference({
        ...scope,
        enabled: input.enabled,
        userId,
      }),
  );
}
