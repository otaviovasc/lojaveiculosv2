import type { ServiceContext } from "../../../shared/serviceContext.js";
import { CrmMessageActionError } from "./crmMessagingErrors.js";
import type {
  CreateCrmCampaignInput,
  NormalizedCrmCampaignInput,
} from "./crmCampaignTypes.js";
import {
  assertValidCampaignText,
  dedupeCampaignRecipients,
  normalizePositiveInt,
  renderCampaignText,
  requireCampaignTags,
  resolveCampaignSessions,
} from "./crmCampaignSupport.js";
import type { IngestCampaignMediaResult } from "./crmCampaignMediaIngestion.js";
import { resolveCrmConnectionScopedQueueVisibility } from "./crmQueueVisibility.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export async function validateCampaignBeforeUpload(
  context: ServiceContext,
  input: NormalizedCrmCampaignInput,
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
) {
  const repository = getCrmConversationRepository(ports);
  await requireCampaignTags(repository, scope, [
    input.initialTagId,
    input.replyTagId,
  ]);
  const queueVisibility = await resolveCrmConnectionScopedQueueVisibility(
    context,
    ports,
  );
  await resolveCampaignSessions(
    repository,
    scope,
    input.recipients,
    queueVisibility,
  );
}

export function normalizeCampaignInput(
  input: CreateCrmCampaignInput,
  mediaResult?: IngestCampaignMediaResult,
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
  const mediaFileName = input.mediaFileName?.trim() || null;
  const mediaType = input.mediaType?.trim() || null;
  if (!input.mediaBase64?.trim() && (mediaFileName || mediaType)) {
    throw new CrmMessageActionError(
      "Campaign media requires a base64 image upload.",
    );
  }
  if (input.mediaBase64?.trim()) {
    for (const [sequence, recipient] of recipients.entries()) {
      const rendered = renderCampaignText(content, recipient.variables);
      if (rendered.length > 1000) {
        throw new CrmMessageActionError(
          `Campaign image caption for recipient ${sequence + 1} exceeds 1000 characters.`,
        );
      }
    }
  }
  return {
    content,
    initialTagId: input.initialTagId ?? null,
    intervalMinutes: normalizePositiveInt(input.intervalMinutes, 1),
    mediaFileName: mediaResult?.mediaFileName ?? mediaFileName,
    mediaStorageKey: mediaResult?.storageKey ?? null,
    mediaType: mediaResult?.mediaType ?? mediaType,
    mediaUrl: mediaResult?.mediaUrl ?? null,
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
