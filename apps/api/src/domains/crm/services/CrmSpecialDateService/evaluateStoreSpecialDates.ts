import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { calculateSendInstantUtc } from "../../messaging/crmSpecialDateCalculator.js";
import { resolveSpecialDateCandidates } from "../../messaging/crmSpecialDateCandidateResolver.js";
import { DEFAULT_SPECIAL_DATE_TEMPLATES } from "../../messaging/crmSpecialDateDefaults.js";
import { normalizeWhatsappPhone } from "../../messaging/startConversationSupport.js";
import { assertSchedulingRoute } from "../../messaging/assertSchedulingRoute.js";
import { CrmMessageActionError } from "../../messaging/crmMessagingErrors.js";
import { CrmRoutingPolicyValidationError } from "../CrmRoutingService/routingErrors.js";
import {
  getCrmConnectionRepository,
  getCrmSpecialDateRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { renderSpecialDateText } from "../../messaging/crmSpecialDateTemplate.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import {
  requireSpecialDateScope,
  specialDateProcessPermission,
  type SpecialDateScope,
} from "../../messaging/crmSpecialDateServiceSupport.js";

export type EvaluateStoreSpecialDatesResult = {
  evaluatedConfigs: number;
  scheduledMessages: number;
};

export async function evaluateStoreSpecialDates(
  context: ServiceContext,
  ports: CrmServicePorts,
  referenceDate: Date = new Date(),
): Promise<EvaluateStoreSpecialDatesResult> {
  assertPermission(context, specialDateProcessPermission);
  assertEntitlement(context, "crm");
  const scope = requireSpecialDateScope(context);
  logCrmServiceEvent(context, "crm.special_date.evaluate.started", {
    referenceDate: referenceDate.toISOString(),
  });

  const repository = getCrmSpecialDateRepository(ports);
  const connectionRepo = getCrmConnectionRepository(ports);

  const configs = await repository.listEnabledConfigs(
    scope.tenantId,
    scope.storeId,
  );

  let scheduledMessagesCount = 0;

  for (const config of configs) {
    if (!config.enabled) continue;

    // Verify ownership, channel and provider readiness before creating work.
    const connection = await connectionRepo.findConnectionById(
      config.connectionId,
    );
    if (
      !connection ||
      connection.storeId !== scope.storeId ||
      connection.tenantId !== scope.tenantId ||
      connection.status !== "active" ||
      connection.channel !== "whatsapp" ||
      !["zapi", "uazapi", "meta_cloud"].includes(connection.provider)
    ) {
      logCrmServiceEvent(context, "crm.special_date.config.skipped", {
        connectionId: config.connectionId,
        dateType: config.dateType,
        reason: "connection_unavailable",
      });
      continue;
    }

    // Existing configurations can predate the store routing policy. Do not
    // queue work that the scheduler will deterministically reject.
    if (
      ports.crmRoutingConnectionRepository &&
      ports.crmRoutingPolicyRepository
    ) {
      try {
        await assertSchedulingRoute(config.connectionId, scope, ports);
      } catch (error) {
        if (!(
          error instanceof CrmRoutingPolicyValidationError ||
          error instanceof CrmMessageActionError
        )) {
          throw error;
        }
        logCrmServiceEvent(context, "crm.special_date.config.skipped", {
          connectionId: config.connectionId,
          dateType: config.dateType,
          reason: error.name,
        });
        continue;
      }
    }

    const scheduledAt = calculateSendInstantUtc(referenceDate, config.sendTime);

    const candidates = await resolveSpecialDateCandidates(
      repository,
      scope,
      config,
      referenceDate,
    );

    const recipientPhones = new Set<string>();
    for (const { candidate, targetYear } of candidates) {
      if (!candidate.phone) continue;
      let normalizedPhone: string;
      try {
        normalizedPhone = normalizeWhatsappPhone(candidate.phone);
      } catch {
        continue;
      }
      // Imported or duplicate lead rows can point to the same contact. Keep
      // one outbound automation per connection/contact.
      if (recipientPhones.has(normalizedPhone)) continue;
      recipientPhones.add(normalizedPhone);

      const template =
        config.messageTemplate.trim() ||
        DEFAULT_SPECIAL_DATE_TEMPLATES[config.dateType];
      const content = renderSpecialDateText(template, candidate.name);

      // Atomic schedule: commits execution deduplication row and scheduled message in one transaction
      const scheduleResult = await repository.scheduleSpecialDateAtomic({
        configId: config.id,
        connectionId: config.connectionId,
        content,
        channel: "WHATSAPP",
        configRevision: config.revision,
        customerDisplayName: candidate.name,
        customerPhone: normalizedPhone,
        dateType: config.dateType,
        recipientAddress: normalizedPhone,
        recipientKey: candidate.key,
        scheduledAt,
        storeId: scope.storeId,
        targetYear,
        tenantId: scope.tenantId,
        metadata: {
          configUpdatedAt: config.updatedAt.toISOString(),
        },
      });

      if (scheduleResult.scheduled) {
        scheduledMessagesCount += 1;
      }
    }
  }

  await auditCrmServiceEvent(context, {
    action: "crm.special_date.evaluate",
    category: "data_change",
    entityId: scope.storeId,
    entityType: "store",
    metadata: {
      evaluatedConfigs: configs.length,
      scheduledMessages: scheduledMessagesCount,
    },
    permission: specialDateProcessPermission,
    storeId: scope.storeId,
    summary: `Evaluated ${configs.length} special date configurations; scheduled ${scheduledMessagesCount} messages.`,
    tenantId: scope.tenantId,
  });

  return {
    evaluatedConfigs: configs.length,
    scheduledMessages: scheduledMessagesCount,
  };
}
