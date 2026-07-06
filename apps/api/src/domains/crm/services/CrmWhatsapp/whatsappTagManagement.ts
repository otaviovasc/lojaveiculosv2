import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { WhatsappSessionTag } from "../../whatsapp/whatsappModels.js";
import { WhatsappTagNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmWhatsappRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

const tagManagePermission = "crm.whatsapp.tags.manage";

export type CreateWhatsappTagInput = {
  color?: string;
  connectionId?: string | null;
  emoji?: string | null;
  name: string;
};

export type UpdateWhatsappTagInput = {
  color?: string;
  emoji?: string | null;
  name?: string;
  sortOrder?: number;
  tagId: string;
};

export type DeleteWhatsappTagInput = {
  tagId: string;
};

export type ReorderWhatsappTagsInput = {
  tagIds: readonly string[];
};

export async function createWhatsappTag(
  context: ServiceContext,
  input: CreateWhatsappTagInput,
  ports: CrmServicePorts,
): Promise<WhatsappSessionTag> {
  assertPermission(context, tagManagePermission);
  const name = input.name.trim();
  logWhatsappServiceEvent(context, "crm.whatsapp.tag.create.started", {
    connectionId: input.connectionId ?? null,
    name,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.tag.create",
      category: "data_change",
      entityType: "crm_whatsapp_tag",
      metadata: { connectionId: input.connectionId ?? null, name },
      permission: tagManagePermission,
      summary: "Created CRM WhatsApp tag",
    },
    async () => {
      const scope = requireCrmScope(context);
      return getCrmWhatsappRepository(ports).createTag({
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

export async function updateWhatsappTag(
  context: ServiceContext,
  input: UpdateWhatsappTagInput,
  ports: CrmServicePorts,
): Promise<WhatsappSessionTag> {
  assertPermission(context, tagManagePermission);
  logWhatsappServiceEvent(context, "crm.whatsapp.tag.update.started", {
    tagId: input.tagId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.tag.update",
      category: "data_change",
      entityId: input.tagId,
      entityType: "crm_whatsapp_tag",
      metadata: { tagId: input.tagId },
      permission: tagManagePermission,
      summary: "Updated CRM WhatsApp tag",
    },
    async () => {
      const scope = requireCrmScope(context);
      const tag = await getCrmWhatsappRepository(ports).updateTag({
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
      if (!tag) throw new WhatsappTagNotFoundError(input.tagId);
      return tag;
    },
  );
}

export async function deleteWhatsappTag(
  context: ServiceContext,
  input: DeleteWhatsappTagInput,
  ports: CrmServicePorts,
): Promise<WhatsappSessionTag> {
  assertPermission(context, tagManagePermission);
  logWhatsappServiceEvent(context, "crm.whatsapp.tag.delete.started", {
    tagId: input.tagId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.tag.delete",
      category: "data_change",
      entityId: input.tagId,
      entityType: "crm_whatsapp_tag",
      metadata: { tagId: input.tagId },
      permission: tagManagePermission,
      summary: "Deleted CRM WhatsApp tag",
    },
    async () => {
      const scope = requireCrmScope(context);
      const tag = await getCrmWhatsappRepository(ports).deleteTag({
        id: input.tagId,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!tag) throw new WhatsappTagNotFoundError(input.tagId);
      return tag;
    },
  );
}

export async function reorderWhatsappTags(
  context: ServiceContext,
  input: ReorderWhatsappTagsInput,
  ports: CrmServicePorts,
): Promise<readonly WhatsappSessionTag[]> {
  assertPermission(context, tagManagePermission);
  logWhatsappServiceEvent(context, "crm.whatsapp.tag.reorder.started", {
    tagCount: input.tagIds.length,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.tag.reorder",
      category: "data_change",
      entityType: "crm_whatsapp_tag",
      metadata: { tagCount: input.tagIds.length },
      permission: tagManagePermission,
      summary: "Reordered CRM WhatsApp tags",
    },
    async () => {
      const scope = requireCrmScope(context);
      return getCrmWhatsappRepository(ports).reorderTags({
        storeId: scope.storeId as never,
        tagIds: input.tagIds,
        tenantId: scope.tenantId as never,
      });
    },
  );
}
