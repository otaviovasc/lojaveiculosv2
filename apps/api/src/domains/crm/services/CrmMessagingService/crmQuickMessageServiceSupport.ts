import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { CrmQuickMessageKind } from "../../ports/crmConversationRepository.js";
import {
  defaultCrmQuickMessages,
  normalizeQuickMessageShortcut,
  toCrmQuickMessage,
  type CrmQuickMessage,
} from "./crmQuickMessageModels.js";

export class CrmQuickMessageError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "CrmQuickMessageError";
  }
}

export function quickMessageAuditInput(
  action: string,
  entityId: string,
  permission: "crm.messages.send",
  cycleId?: string,
) {
  return {
    action,
    category: "data_change" as const,
    entityId,
    entityType: "crm_quick_message",
    metadata: { ...(cycleId ? { cycleId } : {}) },
    permission,
    summary: "Changed CRM WhatsApp quick message",
  };
}

export async function assertQuickShortcutAvailable(
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
  shortcut: string,
) {
  const messages = await getCrmConversationRepository(ports).listQuickMessages({
    includeInactive: true,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (messages.some((message) => message.shortcut === shortcut)) {
    throw new CrmQuickMessageError(`Shortcut "/${shortcut}" already exists.`);
  }
}

export function actorUserId(context: ServiceContext): string | null {
  return context.actor.kind === "user" && isUuid(context.actor.id)
    ? context.actor.id
    : null;
}

export async function findQuickMessage(
  context: ServiceContext,
  quickMessageId: string,
  ports: CrmServicePorts,
) {
  if (quickMessageId.startsWith("system:")) {
    const system = defaultCrmQuickMessages.find(
      (message) => message.id === quickMessageId,
    );
    if (system) return system;
  }
  const scope = requireCrmMessagingScope(context);
  const message = await getCrmConversationRepository(
    ports,
  ).findQuickMessageById({
    quickMessageId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!message) throw new CrmQuickMessageError("Template not found.", 404);
  return toCrmQuickMessage(message);
}

export function mergeSystemQuickMessages(messages: CrmQuickMessage[]) {
  const shortcuts = new Set(messages.map((message) => message.shortcut));
  return [
    ...defaultCrmQuickMessages.filter(
      (message) => !shortcuts.has(message.shortcut),
    ),
    ...messages,
  ].sort((left, right) => left.sortOrder - right.sortOrder);
}

export async function nextQuickSortOrder(
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
) {
  const messages = await getCrmConversationRepository(ports).listQuickMessages({
    includeInactive: true,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  return Math.max(0, ...messages.map((message) => message.sortOrder)) + 10;
}

export function normalizeRequiredShortcut(value: string) {
  const shortcut = normalizeQuickMessageShortcut(value);
  if (!shortcut) throw new CrmQuickMessageError("Shortcut is required.");
  return shortcut;
}

export function requireQuickMediaUrl(message: CrmQuickMessage) {
  if (!message.mediaUrl) {
    throw new CrmQuickMessageError("Template media is missing.", 422);
  }
  return message.mediaUrl;
}

export function validateQuickMessageInput(input: {
  content?: string | undefined;
  kind: CrmQuickMessageKind;
  mediaBase64?: string | undefined;
  title?: string | undefined;
}) {
  if (!input.title?.trim()) {
    throw new CrmQuickMessageError("Title is required.");
  }
  if (input.kind === "TEXT" && !input.content?.trim()) {
    throw new CrmQuickMessageError("Text template content is required.");
  }
  if (input.kind !== "TEXT" && !input.mediaBase64?.trim()) {
    throw new CrmQuickMessageError("Media template file is required.");
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
