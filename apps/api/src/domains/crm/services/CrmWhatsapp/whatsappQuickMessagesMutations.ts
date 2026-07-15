import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmWhatsappMediaStorage,
  getCrmWhatsappRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  toWhatsappQuickMessage,
  type WhatsappQuickMessage,
} from "./whatsappQuickMessageModels.js";
import {
  deleteQuickMessageMedia,
  storeQuickMessageMedia,
} from "./whatsappQuickMessageMedia.js";
import type { UpdateCrmWhatsappQuickMessageInput as RepositoryQuickMessageUpdate } from "../../ports/crmWhatsappRepository.js";
import {
  actorUserId,
  assertQuickShortcutAvailable,
  nextQuickSortOrder,
  normalizeRequiredShortcut,
  quickMessageAuditInput,
  validateQuickMessageInput,
  WhatsappQuickMessageError,
} from "./whatsappQuickMessageServiceSupport.js";
import type {
  CreateWhatsappQuickMessageInput,
  UpdateWhatsappQuickMessageInput,
} from "../../whatsapp/quickMessageInput.js";

const writePermission = "crm.whatsapp.send";

export async function createWhatsappQuickMessage(
  context: ServiceContext,
  input: CreateWhatsappQuickMessageInput,
  ports: CrmServicePorts,
): Promise<WhatsappQuickMessage> {
  assertPermission(context, writePermission);
  const scope = requireCrmWhatsappScope(context);
  const repository = getCrmWhatsappRepository(ports);
  const shortcut = normalizeRequiredShortcut(input.shortcut);
  const kind = input.kind ?? "TEXT";
  validateQuickMessageInput({ ...input, kind });
  await assertQuickShortcutAvailable(ports, scope, shortcut);
  logWhatsappServiceEvent(context, "crm.whatsapp.quick_message.create", {
    kind,
    shortcut,
  });

  return recordWhatsappServiceMutation(
    context,
    quickMessageAuditInput(
      "crm.whatsapp.quick_message.create",
      shortcut,
      writePermission,
    ),
    async () => {
      const media = await storeQuickMessageMedia({
        ...(input.mediaBase64 !== undefined
          ? { base64: input.mediaBase64 }
          : {}),
        ...(input.mediaFileName !== undefined
          ? { fileName: input.mediaFileName }
          : {}),
        kind,
        ...(input.mediaType !== undefined
          ? { mediaType: input.mediaType }
          : {}),
        scope,
        storage: getCrmWhatsappMediaStorage(ports),
      });
      const created = await repository.createQuickMessage({
        content: input.content?.trim() ?? "",
        createdByUserId: actorUserId(context) as never,
        kind,
        mediaType: media?.mediaType ?? null,
        mediaUrl: media?.mediaUrl ?? null,
        shortcut,
        sortOrder: await nextQuickSortOrder(ports, scope),
        storageKey: media?.storageKey ?? null,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        title: input.title.trim(),
      });
      return toWhatsappQuickMessage(created);
    },
  );
}

export async function deleteWhatsappQuickMessage(
  context: ServiceContext,
  input: { quickMessageId: string },
  ports: CrmServicePorts,
) {
  assertPermission(context, writePermission);
  const scope = requireCrmWhatsappScope(context);
  logWhatsappServiceEvent(context, "crm.whatsapp.quick_message.delete", {
    quickMessageId: input.quickMessageId,
  });
  return recordWhatsappServiceMutation(
    context,
    quickMessageAuditInput(
      "crm.whatsapp.quick_message.delete",
      input.quickMessageId,
      writePermission,
    ),
    async () => {
      const deleted = await getCrmWhatsappRepository(ports).deleteQuickMessage({
        quickMessageId: input.quickMessageId,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!deleted)
        throw new WhatsappQuickMessageError("Template not found.", 404);
      await deleteQuickMessageMedia(
        context,
        getCrmWhatsappMediaStorage(ports),
        deleted.storageKey,
      );
      return toWhatsappQuickMessage(deleted);
    },
  );
}

export async function updateWhatsappQuickMessage(
  context: ServiceContext,
  input: UpdateWhatsappQuickMessageInput,
  ports: CrmServicePorts,
): Promise<WhatsappQuickMessage> {
  assertPermission(context, writePermission);
  const scope = requireCrmWhatsappScope(context);
  const repository = getCrmWhatsappRepository(ports);
  const current = await repository.findQuickMessageById({
    quickMessageId: input.quickMessageId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!current) throw new WhatsappQuickMessageError("Template not found.", 404);
  const shortcut = input.shortcut
    ? normalizeRequiredShortcut(input.shortcut)
    : current.shortcut;
  const kind = input.kind ?? current.kind;
  const reusableMedia =
    kind === current.kind ? (current.mediaUrl ?? undefined) : undefined;
  validateQuickMessageInput({
    content: input.content ?? current.content,
    kind,
    mediaBase64: input.mediaBase64 ?? reusableMedia,
    title: input.title ?? current.title,
  });
  if (shortcut !== current.shortcut) {
    await assertQuickShortcutAvailable(ports, scope, shortcut);
  }
  logWhatsappServiceEvent(context, "crm.whatsapp.quick_message.update", {
    kind,
    quickMessageId: input.quickMessageId,
    shortcutChanged: shortcut !== current.shortcut,
  });

  return recordWhatsappServiceMutation(
    context,
    quickMessageAuditInput(
      "crm.whatsapp.quick_message.update",
      input.quickMessageId,
      writePermission,
    ),
    async () => {
      const media = input.mediaBase64
        ? await storeQuickMessageMedia({
            base64: input.mediaBase64,
            ...(input.mediaFileName !== undefined
              ? { fileName: input.mediaFileName }
              : {}),
            kind,
            ...(input.mediaType !== undefined
              ? { mediaType: input.mediaType }
              : {}),
            scope,
            storage: getCrmWhatsappMediaStorage(ports),
          })
        : null;
      const mediaPatch =
        kind === "TEXT"
          ? { mediaType: null, mediaUrl: null, storageKey: null }
          : media
            ? {
                mediaType: media.mediaType,
                mediaUrl: media.mediaUrl,
                storageKey: media.storageKey,
              }
            : {};
      const update: RepositoryQuickMessageUpdate = {
        kind,
        ...mediaPatch,
        quickMessageId: input.quickMessageId,
        shortcut,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      };
      if (input.content !== undefined) update.content = input.content.trim();
      if (input.title !== undefined) update.title = input.title.trim();
      const updated = await repository.updateQuickMessage(update);
      if (!updated)
        throw new WhatsappQuickMessageError("Template not found.", 404);
      if (media || kind === "TEXT") {
        await deleteQuickMessageMedia(
          context,
          getCrmWhatsappMediaStorage(ports),
          current.storageKey,
        );
      }
      return toWhatsappQuickMessage(updated);
    },
  );
}
