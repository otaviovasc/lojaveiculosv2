import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmTag } from "../../ports/crmConversationRepository.js";
import { CrmTagNotFoundError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";

const tagManagePermission = "crm.tags.manage";

export type CreateCrmTagInput = {
  color?: string;
  connectionId?: string | null;
  emoji?: string | null;
  name: string;
};

export type UpdateCrmTagInput = {
  color?: string;
  emoji?: string | null;
  name?: string;
  sortOrder?: number;
  tagId: string;
};

export type DeleteCrmTagInput = {
  tagId: string;
};

export type ReorderCrmTagsInput = {
  tagIds: readonly string[];
};

export async function createCrmTag(
  context: ServiceContext,
  input: CreateCrmTagInput,
  ports: CrmServicePorts,
): Promise<CrmTag> {
  assertPermission(context, tagManagePermission);
  const name = input.name.trim();
  logCrmServiceEvent(context, "crm.tag.create.started", {
    connectionId: input.connectionId ?? null,
    name,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.tag.create",
      category: "data_change",
      entityType: "crm_whatsapp_tag",
      metadata: { connectionId: input.connectionId ?? null, name },
      permission: tagManagePermission,
      summary: "Created CRM WhatsApp tag",
    },
    async () => {
      const scope = requireCrmMessagingScope(context);
      return getCrmConversationRepository(ports).createTag({
        color: input.color ?? "#64748b",
        connectionId: input.connectionId ?? null,
        emoji: input.emoji ?? null,
        name,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
    },
  );
}

export async function updateCrmTag(
  context: ServiceContext,
  input: UpdateCrmTagInput,
  ports: CrmServicePorts,
): Promise<CrmTag> {
  assertPermission(context, tagManagePermission);
  logCrmServiceEvent(context, "crm.tag.update.started", {
    tagId: input.tagId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.tag.update",
      category: "data_change",
      entityId: input.tagId,
      entityType: "crm_whatsapp_tag",
      metadata: { tagId: input.tagId },
      permission: tagManagePermission,
      summary: "Updated CRM WhatsApp tag",
    },
    async () => {
      const scope = requireCrmMessagingScope(context);
      const tag = await getCrmConversationRepository(ports).updateTag({
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
        id: input.tagId,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.sortOrder !== undefined
          ? { sortOrder: input.sortOrder }
          : {}),
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!tag) throw new CrmTagNotFoundError(input.tagId);
      return tag;
    },
  );
}

export async function deleteCrmTag(
  context: ServiceContext,
  input: DeleteCrmTagInput,
  ports: CrmServicePorts,
): Promise<CrmTag> {
  assertPermission(context, tagManagePermission);
  logCrmServiceEvent(context, "crm.tag.delete.started", {
    tagId: input.tagId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.tag.delete",
      category: "data_change",
      entityId: input.tagId,
      entityType: "crm_whatsapp_tag",
      metadata: { tagId: input.tagId },
      permission: tagManagePermission,
      summary: "Deleted CRM WhatsApp tag",
    },
    async () => {
      const scope = requireCrmMessagingScope(context);
      const tag = await getCrmConversationRepository(ports).deleteTag({
        id: input.tagId,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!tag) throw new CrmTagNotFoundError(input.tagId);
      return tag;
    },
  );
}

export async function reorderCrmTags(
  context: ServiceContext,
  input: ReorderCrmTagsInput,
  ports: CrmServicePorts,
): Promise<readonly CrmTag[]> {
  assertPermission(context, tagManagePermission);
  logCrmServiceEvent(context, "crm.tag.reorder.started", {
    tagCount: input.tagIds.length,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.tag.reorder",
      category: "data_change",
      entityType: "crm_whatsapp_tag",
      metadata: { tagCount: input.tagIds.length },
      permission: tagManagePermission,
      summary: "Reordered CRM WhatsApp tags",
    },
    async () => {
      const scope = requireCrmMessagingScope(context);
      return getCrmConversationRepository(ports).reorderTags({
        storeId: scope.storeId as never,
        tagIds: input.tagIds,
        tenantId: scope.tenantId as never,
      });
    },
  );
}
