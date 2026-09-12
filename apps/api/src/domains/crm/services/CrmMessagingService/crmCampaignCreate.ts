import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmCampaign } from "../../ports/crmConversationRepository.js";
import {
  getCrmConversationRepository,
  getCrmMediaStorage,
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
} from "../../messaging/crmCampaignTypes.js";
import {
  campaignScheduledEnd,
  resolveCampaignSessions,
  singleCampaignConnectionId,
} from "../../messaging/crmCampaignSupport.js";
import { resolveCrmConnectionScopedQueueVisibility } from "../../messaging/crmQueueVisibility.js";
import { ingestCampaignMedia } from "../../messaging/crmCampaignMediaIngestion.js";
import {
  normalizeCampaignInput,
  validateCampaignBeforeUpload,
} from "../../messaging/crmCampaignInput.js";
import { createInitialSchedules } from "../../messaging/crmCampaignScheduling.js";

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
  const scope = requireCrmMessagingScope(context);
  // Validate the complete campaign envelope and recipient visibility before
  // any object-storage side effect can occur. A malformed or unauthorized
  // campaign therefore cannot leave an orphaned upload behind.
  const inputWithoutMedia = normalizeCampaignInput(input);
  await validateCampaignBeforeUpload(context, inputWithoutMedia, ports, scope);
  const mediaResult = await ingestCampaignMedia(context, ports, {
    ...(input.mediaBase64 !== undefined
      ? { mediaBase64: input.mediaBase64 }
      : {}),
    ...(input.mediaFileName !== undefined
      ? { mediaFileName: input.mediaFileName }
      : {}),
    ...(input.mediaType !== undefined ? { mediaType: input.mediaType } : {}),
  });
  const normalized = {
    ...inputWithoutMedia,
    mediaFileName: mediaResult.mediaFileName,
    mediaStorageKey: mediaResult.storageKey,
    mediaType: mediaResult.mediaType,
    mediaUrl: mediaResult.mediaUrl,
  };
  logCrmServiceEvent(context, "crm.campaign.create.started", {
    hasMedia: Boolean(normalized.mediaUrl),
    recipientCount: normalized.recipients.length,
  });
  let transactionCommitted = false;
  try {
    return await recordCrmServiceMutation(
      context,
      {
        action: "crm.campaign.create",
        category: "data_change",
        metadata: {
          hasInitialStage: Boolean(normalized.initialStageId),
          hasMedia: Boolean(normalized.mediaUrl),
          hasReplyStage: Boolean(normalized.replyStageId),
          recipientCount: normalized.recipients.length,
        },
        permission: campaignManagePermission,
        summary: "Created CRM WhatsApp campaign",
      },
      async () => {
        const result = await runCrmTransaction(ports, (tx) =>
          createCampaignRecords(context, normalized, tx),
        );
        transactionCommitted = true;
        return result;
      },
    );
  } catch (error) {
    // Object storage is outside the database transaction. Compensate when the
    // campaign write fails after a managed upload has already succeeded.
    if (!transactionCommitted && mediaResult.storageKey) {
      const storage = getCrmMediaStorage(ports);
      if (storage?.deleteObject) {
        await storage
          .deleteObject({ storageKey: mediaResult.storageKey })
          .catch((cleanupError) => {
            context.logger.warn("crm.campaign.media_cleanup.failed", {
              errorName:
                cleanupError instanceof Error
                  ? cleanupError.name
                  : "UnknownError",
              requestId: context.requestId,
            });
          });
      }
    }
    throw error;
  }
}

async function createCampaignRecords(
  context: ServiceContext,
  input: ReturnType<typeof normalizeCampaignInput>,
  ports: CrmServicePorts,
) {
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConversationRepository(ports);
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
    initialStageId: input.initialStageId,
    intervalMinutes: input.intervalMinutes,
    mediaType: input.mediaType ?? null,
    mediaUrl: input.mediaUrl ?? null,
    metadata: {
      ...(input.mediaStorageKey
        ? { mediaStorageKey: input.mediaStorageKey }
        : {}),
      ...(input.mediaFileName ? { mediaFileName: input.mediaFileName } : {}),
    },
    name: input.name,
    replyStageId: input.replyStageId,
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
  return campaign;
}
