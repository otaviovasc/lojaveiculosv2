import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmMediaStorage,
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  toCrmQuickMessage,
  type CrmQuickMessage,
} from "./crmQuickMessageModels.js";
import {
  deleteQuickMessageMedia,
  storeQuickMessageMedia,
} from "./crmQuickMessageMedia.js";
import type { UpdateCrmQuickMessageInput as RepositoryQuickMessageUpdate } from "../../ports/crmConversationRepository.js";
import {
  actorUserId,
  assertQuickShortcutAvailable,
  nextQuickSortOrder,
  normalizeRequiredShortcut,
  quickMessageAuditInput,
  validateQuickMessageInput,
  CrmQuickMessageError,
} from "./crmQuickMessageServiceSupport.js";
import type {
  CreateCrmQuickMessageInput,
  UpdateCrmQuickMessageInput,
} from "../../messaging/quickMessageInput.js";

const writePermission = "crm.messages.send";

export async function createCrmQuickMessage(
  context: ServiceContext,
  input: CreateCrmQuickMessageInput,
  ports: CrmServicePorts,
): Promise<CrmQuickMessage> {
  assertPermission(context, writePermission);
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConversationRepository(ports);
  const shortcut = normalizeRequiredShortcut(input.shortcut);
  const kind = input.kind ?? "TEXT";
  validateQuickMessageInput({ ...input, kind });
  await assertQuickShortcutAvailable(ports, scope, shortcut);
  logCrmServiceEvent(context, "crm.quick_message.create", {
    kind,
    shortcut,
  });

  return recordCrmServiceMutation(
    context,
    quickMessageAuditInput(
      "crm.quick_message.create",
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
        storage: getCrmMediaStorage(ports),
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
      return toCrmQuickMessage(created);
    },
  );
}

export async function deleteCrmQuickMessage(
  context: ServiceContext,
  input: { quickMessageId: string },
  ports: CrmServicePorts,
) {
  assertPermission(context, writePermission);
  const scope = requireCrmMessagingScope(context);
  logCrmServiceEvent(context, "crm.quick_message.delete", {
    quickMessageId: input.quickMessageId,
  });
  return recordCrmServiceMutation(
    context,
    quickMessageAuditInput(
      "crm.quick_message.delete",
      input.quickMessageId,
      writePermission,
    ),
    async () => {
      const deleted = await getCrmConversationRepository(
        ports,
      ).deleteQuickMessage({
        quickMessageId: input.quickMessageId,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!deleted) throw new CrmQuickMessageError("Template not found.", 404);
      await deleteQuickMessageMedia(
        context,
        getCrmMediaStorage(ports),
        deleted.storageKey,
      );
      return toCrmQuickMessage(deleted);
    },
  );
}

export async function updateCrmQuickMessage(
  context: ServiceContext,
  input: UpdateCrmQuickMessageInput,
  ports: CrmServicePorts,
): Promise<CrmQuickMessage> {
  assertPermission(context, writePermission);
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConversationRepository(ports);
  const current = await repository.findQuickMessageById({
    quickMessageId: input.quickMessageId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!current) throw new CrmQuickMessageError("Template not found.", 404);
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
  logCrmServiceEvent(context, "crm.quick_message.update", {
    kind,
    quickMessageId: input.quickMessageId,
    shortcutChanged: shortcut !== current.shortcut,
  });

  return recordCrmServiceMutation(
    context,
    quickMessageAuditInput(
      "crm.quick_message.update",
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
            storage: getCrmMediaStorage(ports),
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
      if (!updated) throw new CrmQuickMessageError("Template not found.", 404);
      if (media || kind === "TEXT") {
        await deleteQuickMessageMedia(
          context,
          getCrmMediaStorage(ports),
          current.storageKey,
        );
      }
      return toCrmQuickMessage(updated);
    },
  );
}
