import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmScheduledMessage } from "../../ports/crmConversationRepository.js";
import { assertSchedulingRoute } from "../../messaging/assertSchedulingRoute.js";
import { applyHumanOutboundAssignment } from "../../messaging/autoAssignHumanCrmOutbound.js";
import { CrmMessageActionError } from "../../messaging/crmMessagingErrors.js";
import { normalizeWhatsappPhone } from "../../messaging/startConversationSupport.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { findScopedConversationCycle } from "./conversationCycleMutationSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";

const createPermission = "crm.scheduled_messages.create";

type CreateCrmScheduledMessageBase = {
  scheduledAt: Date;
  content: string;
};

export type CreateCrmScheduledMessageInput = CreateCrmScheduledMessageBase &
  (
    | { cycleId: string }
    | {
        connectionId: string;
        customerDisplayName?: string;
        phone: string;
      }
  );

export async function createCrmScheduledMessage(
  context: ServiceContext,
  input: CreateCrmScheduledMessageInput,
  ports: CrmServicePorts,
): Promise<CrmScheduledMessage> {
  assertPermission(context, createPermission);
  const content = input.content.trim();
  if (!content) throw new CrmMessageActionError("Message content is required.");
  if (input.scheduledAt <= new Date()) {
    throw new CrmMessageActionError(
      "Scheduled message time must be in the future.",
    );
  }
  const target =
    "cycleId" in input
      ? {
          entityId: input.cycleId,
          entityType: "crm_conversation_cycle" as const,
          logMetadata: { cycleId: input.cycleId },
        }
      : {
          entityId: input.connectionId,
          entityType: "crm_channel_connection" as const,
          logMetadata: { target: "phone" },
        };
  logCrmServiceEvent(context, "crm.scheduled_messages.create.started", {
    ...target.logMetadata,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.scheduled_messages.create",
      category: "data_change",
      entityId: target.entityId,
      entityType: target.entityType,
      metadata: {
        scheduledAt: input.scheduledAt.toISOString(),
        contentLength: content.length,
      },
      permission: createPermission,
      summary: "Scheduled CRM WhatsApp message",
    },
    async () => {
      const scope = requireCrmMessagingScope(context);
      return runCrmTransaction(ports, async (transactionPorts) => {
        const conversationCycle = await resolveScheduledMessageCycle(
          context,
          input,
          scope,
          transactionPorts,
        );
        return getCrmConversationRepository(
          transactionPorts,
        ).createScheduledMessage({
          connectionId: conversationCycle.connectionId,
          createdByUserId: context.actor.id as never,
          recipientAddress: conversationCycle.customerPhone,
          scheduledAt: input.scheduledAt,
          cycleId: conversationCycle.id,
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
          content,
        });
      });
    },
  );
}

async function resolveScheduledMessageCycle(
  context: ServiceContext,
  input: CreateCrmScheduledMessageInput,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  if ("cycleId" in input) {
    const { conversationCycle } = await findScopedConversationCycle(
      context,
      { cycleId: input.cycleId },
      ports,
    );
    if (
      conversationCycle.channel !== "WHATSAPP" ||
      !conversationCycle.customerPhone
    ) {
      throw new CrmMessageActionError(
        "Scheduled messages require a WhatsApp conversation with a valid phone.",
      );
    }
    await assertSchedulingRoute(conversationCycle.connectionId, scope, ports);
    return conversationCycle;
  }

  const phone = normalizeWhatsappPhone(input.phone);
  await assertSchedulingRoute(input.connectionId, scope, ports);
  const repository = getCrmConversationRepository(ports);
  const existing = await repository.findConversationCycleByIdentity({
    customerPhone: phone,
    channel: "WHATSAPP",
    connectionId: input.connectionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (existing) {
    const { conversationCycle } = await findScopedConversationCycle(
      context,
      { cycleId: existing.id },
      ports,
    );
    return conversationCycle;
  }

  let conversationCycle = await repository.upsertConversationCycleContext({
    ...(input.customerDisplayName
      ? { customerDisplayName: input.customerDisplayName.trim() }
      : {}),
    customerPhone: phone,
    channel: "WHATSAPP",
    connectionId: input.connectionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (context.actor.kind === "user") {
    conversationCycle = (
      await applyHumanOutboundAssignment({
        context,
        outboundIntentId: `scheduled:${context.requestId}:${phone}`,
        ports,
        providerTimestamp: new Date(),
        scope,
        senderOrigin: "human_crm",
        senderType: "HUMAN",
        conversationCycle,
      })
    ).conversationCycle;
  }
  return conversationCycle;
}
