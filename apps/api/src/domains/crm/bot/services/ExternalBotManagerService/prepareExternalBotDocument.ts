import { assertPermission } from "../../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../../shared/serviceContext.js";
import type { ExternalBotEvent } from "../../externalBotModels.js";
import type { ExternalBotEventPreparationResult } from "../../ports/externalBotEventPreparation.js";
import type { ExternalBotDocumentRecoveryPorts } from "../../ports/externalBotDocumentRecovery.js";
import { mirrorUazapiWhatsappMedia } from "../../../whatsapp/mirrorUazapiWhatsappMedia.js";

/** Recover a persisted document on each durable event attempt, then mint access. */
export async function prepareExternalBotDocument(
  context: ServiceContext,
  event: ExternalBotEvent,
  ports: ExternalBotDocumentRecoveryPorts,
): Promise<ExternalBotEventPreparationResult> {
  assertPermission(context, "crm.bot.events.publish");
  if (
    context.tenantId !== event.tenantId ||
    context.storeId !== event.storeId
  ) {
    return failed("document_scope_mismatch", false);
  }
  if (event.type !== "message_received") return { kind: "ready", event };
  if (!event.payload.messageRef || !(await ports.authorize(event))) {
    return failed("document_access_denied", false);
  }
  const loaded = await ports.load(event);
  if (
    !loaded ||
    loaded.message.deletedAt ||
    loaded.message.connectionId !== event.connectionId ||
    loaded.message.tenantId !== event.tenantId ||
    loaded.message.storeId !== event.storeId ||
    loaded.connection.tenantId !== event.tenantId ||
    loaded.connection.storeId !== event.storeId ||
    loaded.connection.provider !== event.provider
  )
    return failed("document_scope_mismatch", false);
  const { message, connection } = loaded;
  if (message.type !== "DOCUMENT") return { kind: "ready", event };
  if (!ports.storage) return failed("document_storage_unavailable", true);
  let metadata = message.metadata;
  let media = readRecord(metadata.media);
  if (media.mirrorStatus !== "stored" || typeof media.storageKey !== "string") {
    const mirrored = await mirrorUazapiWhatsappMedia({
      connectionId: connection.id,
      externalId: message.externalId ?? message.id,
      mediaType: "document",
      ...(message.mediaUrl ? { mediaUrl: message.mediaUrl } : {}),
      metadata,
      remoteMediaFetcher: ports.fetcher,
      storage: ports.storage,
      storeId: event.storeId,
      tenantId: event.tenantId,
      ...(event.provider === "uazapi" &&
      message.externalId &&
      ports.gateway.downloadInboundMedia
        ? {
            resolveMediaUrl: async () =>
              (
                await ports.gateway.downloadInboundMedia!(connection, {
                  messageId: message.externalId!,
                })
              ).mediaUrl,
          }
        : {}),
    });
    metadata = mirrored.metadata;
    media = readRecord(metadata.media);
    if (
      media.mirrorStatus !== "stored" ||
      !mirrored.mediaUrl ||
      typeof media.storageKey !== "string"
    ) {
      context.logger.warn("crm.bot.document.recovery_failed", {
        eventId: event.id,
        messageId: message.id,
      });
      return failed("document_media_unavailable", true);
    }
    if (!(await ports.save(event, { mediaUrl: mirrored.mediaUrl, metadata }))) {
      return failed("document_persistence_failed", true);
    }
  }
  // Recheck after external IO: a revoked integration or human takeover must win.
  if (!(await ports.authorize(event)))
    return failed("document_access_denied", false);
  const now = (ports.now ?? (() => new Date()))();
  if (event.grantExpiresAt <= now) return failed("grant_expired", false);
  const contentType =
    typeof media.contentType === "string" ? media.contentType : null;
  const download = await ports.storage.createDownload({
    disposition: "attachment",
    fileName: `${message.id}.${contentType === "application/pdf" ? "pdf" : "bin"}`,
    mimeType: contentType,
    storageKey: String(media.storageKey),
  });
  await context.audit.record({
    action: "crm.bot.document.access_issued",
    actor: context.actor,
    category: "data_access",
    entityId: message.id,
    entityType: "crm_message",
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    summary: "Issue temporary document download access to external CRM bot",
    metadata: {
      eventId: event.id,
      integrationId: event.integrationId,
      connectionId: event.connectionId,
    },
  });
  context.logger.info("crm.bot.document.ready", {
    eventId: event.id,
    messageId: message.id,
  });
  return {
    kind: "ready",
    event: {
      ...event,
      document: {
        messageRef: message.id,
        downloadUrl: download.downloadUrl,
        expiresAt: download.expiresAt.toISOString(),
        contentType,
      },
    },
  };
}
function failed(
  code: string,
  retryable: boolean,
): ExternalBotEventPreparationResult {
  return { kind: "failed", code, retryable };
}
function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
