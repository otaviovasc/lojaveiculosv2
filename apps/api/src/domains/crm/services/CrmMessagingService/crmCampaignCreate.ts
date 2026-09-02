import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmCampaign,
  CrmConversationRepository,
  CrmConversationCycle,
} from "../../ports/crmConversationRepository.js";
import { CrmMessageActionError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  campaignManagePermission,
  campaignReadPermission,
  type CreateCrmCampaignInput,
  type ListCrmCampaignsInput,
  type NormalizedCrmCampaignInput,
} from "../../messaging/crmCampaignTypes.js";
import {
  assertValidCampaignText,
  campaignScheduledAt,
  campaignScheduledEnd,
  dedupeCampaignRecipients,
  normalizePositiveInt,
  renderCampaignText,
  requireCampaignTags,
  resolveCampaignSessions,
  singleCampaignConnectionId,
} from "../../messaging/crmCampaignSupport.js";
import { resolveCrmConnectionScopedQueueVisibility } from "../../messaging/crmQueueVisibility.js";

export async function listCrmCampaigns(
  context: ServiceContext,
  input: ListCrmCampaignsInput,
  ports: CrmServicePorts,
): Promise<readonly CrmCampaign[]> {
  assertPermission(context, campaignReadPermission);
  const scope = requireCrmMessagingScope(context);
  return getCrmConversationRepository(ports).listCampaigns({
    limit: input.limit ?? 50,
    ...(input.status ? { status: input.status } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}

export async function createCrmCampaign(
  context: ServiceContext,
  input: CreateCrmCampaignInput,
  ports: CrmServicePorts,
): Promise<CrmCampaign> {
  assertPermission(context, campaignManagePermission);
  const normalized = normalizeCampaignInput(input);
  logCrmServiceEvent(context, "crm.campaign.create.started", {
    recipientCount: normalized.recipients.length,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.campaign.create",
      category: "data_change",
      metadata: {
        hasInitialTag: Boolean(normalized.initialTagId),
        hasReplyTag: Boolean(normalized.replyTagId),
        recipientCount: normalized.recipients.length,
      },
      permission: campaignManagePermission,
      summary: "Created CRM WhatsApp campaign",
    },
    () =>
      runCrmTransaction(ports, (tx) =>
        createCampaignRecords(context, normalized, tx),
      ),
  );
}

function normalizeCampaignInput(
  input: CreateCrmCampaignInput,
): NormalizedCrmCampaignInput {
  const name = input.name.trim();
  const content = input.content.trim();
  assertValidCampaignText(name, content);
  if (input.scheduledStartAt <= new Date()) {
    throw new CrmMessageActionError(
      "Campaign start time must be in the future.",
    );
  }
  const recipients = dedupeCampaignRecipients(input.recipients);
  if (!recipients.length) {
    throw new CrmMessageActionError("At least one recipient is required.");
  }
  return {
    content,
    initialTagId: input.initialTagId ?? null,
    intervalMinutes: normalizePositiveInt(input.intervalMinutes, 1),
    name,
    recipients,
    replyTagId: input.replyTagId ?? null,
    scheduledStartAt: input.scheduledStartAt,
    secondaryContent: input.secondaryContent?.trim() || null,
    secondaryDelayMinutes: normalizePositiveInt(
      input.secondaryDelayMinutes,
      1440,
    ),
  };
}

async function createCampaignRecords(
  context: ServiceContext,
  input: NormalizedCrmCampaignInput,
  ports: CrmServicePorts,
) {
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConversationRepository(ports);
  await requireCampaignTags(repository, scope, [
    input.initialTagId,
    input.replyTagId,
  ]);
  const conversationCycles = await resolveCampaignSessions(
    repository,
    scope,
    input.recipients,
    await resolveCrmConnectionScopedQueueVisibility(context, ports),
  );
  const campaign = await repository.createCampaign({
    content: input.content,
    createdByUserId:
      context.actor.kind === "user" ? (context.actor.id as never) : null,
    initialTagId: input.initialTagId,
    intervalMinutes: input.intervalMinutes,
    metadata: {},
    name: input.name,
    replyTagId: input.replyTagId,
    scheduledCount: conversationCycles.length,
    scheduledEndAt: campaignScheduledEnd(input, conversationCycles.length),
    scheduledStartAt: input.scheduledStartAt,
    secondaryContent: input.secondaryContent,
    secondaryDelayMinutes: input.secondaryDelayMinutes,
    selectedConnectionId: singleCampaignConnectionId(conversationCycles),
    status: "scheduled",
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
    totalRecipients: conversationCycles.length,
  });
  await createInitialSchedules(
    repository,
    campaign,
    input,
    conversationCycles,
    scope,
  );
  if (input.initialTagId) {
    await tagCampaignSessions(
      repository,
      conversationCycles,
      input.initialTagId,
      scope,
    );
  }
  return campaign;
}

async function createInitialSchedules(
  repository: CrmConversationRepository,
  campaign: CrmCampaign,
  input: NormalizedCrmCampaignInput,
  conversationCycles: readonly CrmConversationCycle[],
  scope: { storeId: string; tenantId: string },
) {
  for (const [sequence, conversationCycle] of conversationCycles.entries()) {
    const variables = input.recipients[sequence]?.variables ?? {};
    const scheduled = await repository.createScheduledMessage({
      campaignId: campaign.id,
      campaignMessageType: "initial",
      campaignRecipientKey: conversationCycle.id,
      campaignSequence: sequence,
      connectionId: conversationCycle.connectionId,
      createdByUserId: campaign.createdByUserId,
      metadata: { campaignId: campaign.id, sequence, variables },
      recipientAddress: conversationCycle.customerPhone,
      scheduledAt: campaignScheduledAt(input, sequence),
      cycleId: conversationCycle.id,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
      content: renderCampaignText(input.content, variables),
    });
    await repository.createCampaignRecipient({
      campaignId: campaign.id,
      connectionId: conversationCycle.connectionId,
      initialScheduledMessageId: scheduled.id,
      leadId: conversationCycle.leadId,
      recipientAddress: conversationCycle.customerPhone,
      sequence,
      cycleId: conversationCycle.id,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
      variables,
    });
  }
}

async function tagCampaignSessions(
  repository: CrmConversationRepository,
  conversationCycles: readonly CrmConversationCycle[],
  tagId: string,
  scope: { storeId: string; tenantId: string },
) {
  await Promise.all(
    conversationCycles.map((conversationCycle) =>
      repository.addConversationCycleTag({
        cycleId: conversationCycle.id,
        storeId: scope.storeId as never,
        tagId,
        tenantId: scope.tenantId as never,
      }),
    ),
  );
}
