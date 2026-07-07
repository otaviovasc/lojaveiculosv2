import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  getCrmWhatsappRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { listWhatsappTags } from "../services/CrmWhatsapp/whatsappSessionTags.js";
import {
  WhatsappBotActionError,
  type WhatsappBotActionName,
} from "../services/CrmWhatsapp/whatsappBotIntegration.js";
import type { ExecuteWhatsappBotActionInput } from "../services/CrmWhatsapp/whatsappBotActions.js";

export async function assertBotSendAllowed(
  context: ServiceContext,
  sessionId: string,
  ports: CrmServicePorts,
) {
  const session = await findBotActionSession(context, sessionId, ports);
  if (session.status === "HUMAN_TAKEOVER") {
    throw new WhatsappBotActionError(
      "Bot sends are blocked while human takeover is active.",
      "CRM_WHATSAPP_BOT_ACTION_BLOCKED",
      409,
    );
  }
}

export async function resolveBotActionLeadId(
  context: ServiceContext,
  input: ExecuteWhatsappBotActionInput,
  ports: CrmServicePorts,
) {
  if (input.leadId) return input.leadId;
  if (!input.sessionId) return readRequiredText(input.payload, "leadId");
  const session = await findBotActionSession(context, input.sessionId, ports);
  if (session.leadId) return session.leadId;
  return readRequiredText(input.payload, "leadId");
}

export async function resolveBotActionTagName(
  context: ServiceContext,
  input: ExecuteWhatsappBotActionInput,
  ports: CrmServicePorts,
) {
  const name =
    readOptionalText(input.payload, "name") ??
    readOptionalText(input.payload, "tagName");
  if (name) return name;
  const tagId = input.tagId ?? readOptionalText(input.payload, "tagId");
  if (!tagId) return readRequiredText(input.payload, "name");
  const tags = await listWhatsappTags(context, { limit: 100 }, ports);
  const tag = tags.find((item) => item.id === tagId);
  if (!tag) {
    throw new WhatsappBotActionError(
      "Tag was not found.",
      "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
      404,
    );
  }
  return tag.name;
}

export async function findBotActionSession(
  context: ServiceContext,
  sessionId: string,
  ports: CrmServicePorts,
) {
  const scope = requireCrmScope(context);
  const [session] = await getCrmWhatsappRepository(ports).listSessions({
    limit: 1,
    offset: 0,
    sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session) {
    throw new WhatsappBotActionError(
      "Session was not found.",
      "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
      404,
    );
  }
  return session;
}

export function requireBotActionSessionId(
  input: ExecuteWhatsappBotActionInput,
) {
  return input.sessionId ?? readRequiredText(input.payload, "sessionId");
}

export function mediaTypeForBotAction(action: WhatsappBotActionName) {
  if (action === "send_audio") return "audio";
  if (action === "send_document") return "document";
  return "image";
}

export function readRequiredText(
  payload: Record<string, unknown> | undefined,
  key: string,
) {
  const value = payload?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  throw new WhatsappBotActionError(
    `Payload field ${key} is required.`,
    "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
  );
}

export function readOptionalText(
  payload: Record<string, unknown> | undefined,
  key: string,
) {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readRequiredBoolean(
  payload: Record<string, unknown> | undefined,
  key: string,
) {
  const value = payload?.[key];
  if (typeof value === "boolean") return value;
  throw new WhatsappBotActionError(
    `Payload field ${key} must be boolean.`,
    "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
  );
}

export function readRequiredDate(
  payload: Record<string, unknown> | undefined,
  key: string,
) {
  const value = readRequiredText(payload, key);
  const date = new Date(value);
  if (Number.isFinite(date.getTime())) return date;
  throw new WhatsappBotActionError(
    `Payload field ${key} must be an ISO date.`,
    "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
  );
}

export function readOptionalRecord(
  payload: Record<string, unknown> | undefined,
  key: string,
) {
  const value = payload?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readOptionalNumber(
  payload: Record<string, unknown> | undefined,
  key: string,
) {
  const value = payload?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
