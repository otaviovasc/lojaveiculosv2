import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmWhatsappCampaign,
  CrmWhatsappRepository,
  CrmWhatsappSession,
} from "../../ports/crmWhatsappRepository.js";
import { WhatsappMessageActionError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmWhatsappRepository,
  requireCrmScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  campaignManagePermission,
  campaignReadPermission,
  type CreateWhatsappCampaignInput,
  type ListWhatsappCampaignsInput,
  type NormalizedWhatsappCampaignInput,
} from "../../whatsapp/whatsappCampaignTypes.js";
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
} from "../../whatsapp/whatsappCampaignSupport.js";

export async function listWhatsappCampaigns(
  context: ServiceContext,
  input: ListWhatsappCampaignsInput,
  ports: CrmServicePorts,
): Promise<readonly CrmWhatsappCampaign[]> {
  assertPermission(context, campaignReadPermission);
  const scope = requireCrmScope(context);
  return getCrmWhatsappRepository(ports).listCampaigns({
    limit: input.limit ?? 50,
    ...(input.status ? { status: input.status } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}

export async function createWhatsappCampaign(
  context: ServiceContext,
  input: CreateWhatsappCampaignInput,
  ports: CrmServicePorts,
): Promise<CrmWhatsappCampaign> {
  assertPermission(context, campaignManagePermission);
  const normalized = normalizeCampaignInput(input);
  logWhatsappServiceEvent(context, "crm.whatsapp.campaign.create.started", {
    recipientCount: normalized.recipients.length,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.campaign.create",
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
  input: CreateWhatsappCampaignInput,
): NormalizedWhatsappCampaignInput {
  const name = input.name.trim();
  const content = input.content.trim();
  assertValidCampaignText(name, content);
  if (input.scheduledStartAt <= new Date()) {
    throw new WhatsappMessageActionError(
      "Campaign start time must be in the future.",
    );
  }
  const recipients = dedupeCampaignRecipients(input.recipients);
  if (!recipients.length) {
    throw new WhatsappMessageActionError("At least one recipient is required.");
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
  input: NormalizedWhatsappCampaignInput,
  ports: CrmServicePorts,
) {
  const scope = requireCrmScope(context);
  const repository = getCrmWhatsappRepository(ports);
  await requireCampaignTags(repository, scope, [
    input.initialTagId,
    input.replyTagId,
  ]);
  const sessions = await resolveCampaignSessions(
    repository,
    scope,
    input.recipients,
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
    scheduledCount: sessions.length,
    scheduledEndAt: campaignScheduledEnd(input, sessions.length),
    scheduledStartAt: input.scheduledStartAt,
    secondaryContent: input.secondaryContent,
    secondaryDelayMinutes: input.secondaryDelayMinutes,
    selectedConnectionId: singleCampaignConnectionId(sessions),
    status: "scheduled",
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
    totalRecipients: sessions.length,
  });
  await createInitialSchedules(repository, campaign, input, sessions, scope);
  if (input.initialTagId) {
    await tagCampaignSessions(repository, sessions, input.initialTagId, scope);
  }
  return campaign;
}

async function createInitialSchedules(
  repository: CrmWhatsappRepository,
  campaign: CrmWhatsappCampaign,
  input: NormalizedWhatsappCampaignInput,
  sessions: readonly CrmWhatsappSession[],
  scope: { storeId: string; tenantId: string },
) {
  for (const [sequence, session] of sessions.entries()) {
    const variables = input.recipients[sequence]?.variables ?? {};
    const scheduled = await repository.createScheduledMessage({
      campaignId: campaign.id,
      campaignMessageType: "initial",
      campaignRecipientKey: session.id,
      campaignSequence: sequence,
      connectionId: session.connectionId,
      createdByUserId: campaign.createdByUserId,
      metadata: { campaignId: campaign.id, sequence, variables },
      phone: session.buyerPhone,
      scheduledAt: campaignScheduledAt(input, sequence),
      sessionId: session.id,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
      text: renderCampaignText(input.content, variables),
    });
    await repository.createCampaignRecipient({
      campaignId: campaign.id,
      connectionId: session.connectionId,
      initialScheduledMessageId: scheduled.id,
      leadId: session.leadId,
      phone: session.buyerPhone,
      sequence,
      sessionId: session.id,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
      variables,
    });
  }
}

async function tagCampaignSessions(
  repository: CrmWhatsappRepository,
  sessions: readonly CrmWhatsappSession[],
  tagId: string,
  scope: { storeId: string; tenantId: string },
) {
  await Promise.all(
    sessions.map((session) =>
      repository.addSessionTag({
        sessionId: session.id,
        storeId: scope.storeId as never,
        tagId,
        tenantId: scope.tenantId as never,
      }),
    ),
  );
}
