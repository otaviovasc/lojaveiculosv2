import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmWhatsappRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { CrmWhatsappQuickMessageKind } from "../../ports/crmWhatsappRepository.js";
import {
  defaultWhatsappQuickMessages,
  normalizeQuickMessageShortcut,
  toWhatsappQuickMessage,
  type WhatsappQuickMessage,
} from "./whatsappQuickMessageModels.js";

export class WhatsappQuickMessageError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "WhatsappQuickMessageError";
  }
}

export function quickMessageAuditInput(
  action: string,
  entityId: string,
  permission: "crm.whatsapp.send",
  sessionId?: string,
) {
  return {
    action,
    category: "data_change" as const,
    entityId,
    entityType: "crm_whatsapp_quick_message",
    metadata: { ...(sessionId ? { sessionId } : {}) },
    permission,
    summary: "Changed CRM WhatsApp quick message",
  };
}

export async function assertQuickShortcutAvailable(
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
  shortcut: string,
) {
  const messages = await getCrmWhatsappRepository(ports).listQuickMessages({
    includeInactive: true,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (messages.some((message) => message.shortcut === shortcut)) {
    throw new WhatsappQuickMessageError(
      `Shortcut "/${shortcut}" already exists.`,
    );
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
    const system = defaultWhatsappQuickMessages.find(
      (message) => message.id === quickMessageId,
    );
    if (system) return system;
  }
  const scope = requireCrmWhatsappScope(context);
  const message = await getCrmWhatsappRepository(ports).findQuickMessageById({
    quickMessageId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!message) throw new WhatsappQuickMessageError("Template not found.", 404);
  return toWhatsappQuickMessage(message);
}

export function mergeSystemQuickMessages(messages: WhatsappQuickMessage[]) {
  const shortcuts = new Set(messages.map((message) => message.shortcut));
  return [
    ...defaultWhatsappQuickMessages.filter(
      (message) => !shortcuts.has(message.shortcut),
    ),
    ...messages,
  ].sort((left, right) => left.sortOrder - right.sortOrder);
}

export async function nextQuickSortOrder(
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
) {
  const messages = await getCrmWhatsappRepository(ports).listQuickMessages({
    includeInactive: true,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  return Math.max(0, ...messages.map((message) => message.sortOrder)) + 10;
}

export function normalizeRequiredShortcut(value: string) {
  const shortcut = normalizeQuickMessageShortcut(value);
  if (!shortcut) throw new WhatsappQuickMessageError("Shortcut is required.");
  return shortcut;
}

export function requireQuickMediaUrl(message: WhatsappQuickMessage) {
  if (!message.mediaUrl) {
    throw new WhatsappQuickMessageError("Template media is missing.", 422);
  }
  return message.mediaUrl;
}

export function validateQuickMessageInput(input: {
  content?: string | undefined;
  kind: CrmWhatsappQuickMessageKind;
  mediaBase64?: string | undefined;
  title?: string | undefined;
}) {
  if (!input.title?.trim()) {
    throw new WhatsappQuickMessageError("Title is required.");
  }
  if (input.kind === "TEXT" && !input.content?.trim()) {
    throw new WhatsappQuickMessageError("Text template content is required.");
  }
  if (input.kind !== "TEXT" && !input.mediaBase64?.trim()) {
    throw new WhatsappQuickMessageError("Media template file is required.");
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
