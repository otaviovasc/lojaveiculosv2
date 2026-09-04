import { botError } from "./externalBotErrors.js";
import type { ExternalBotCommand } from "./externalBotModels.js";

const mediaTypes = new Set(["audio", "document", "image", "video"]);
const templateName = /^[a-z0-9_]{1,160}$/;

export function assertExternalBotCommandOperationallySafe(
  command: ExternalBotCommand,
) {
  if (command.action === "message.send_media") {
    const url = safeUrl(command.payload.mediaUrl);
    if (
      !url ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      isUnsafeHostname(url.hostname) ||
      !mediaTypes.has(command.payload.mediaType) ||
      (command.payload.caption?.length ?? 0) > 4_096
    ) {
      throw invalidCommand("External bot media command is not safe.");
    }
  }
  if (command.action === "message.send_template") {
    const variables = Object.entries(command.payload.variables);
    if (
      command.payload.language !== "pt_BR" ||
      !templateName.test(command.payload.templateName) ||
      variables.length > 20 ||
      variables.some(
        ([key, value]) =>
          !/^[a-zA-Z0-9_]{1,80}$/.test(key) || value.length > 500,
      ) ||
      JSON.stringify(command.payload.variables).length > 4_096
    ) {
      throw invalidCommand("External bot template command is not safe.");
    }
  }
}

function isUnsafeHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    /^127\./.test(normalized) ||
    /^10\./.test(normalized) ||
    /^192\.168\./.test(normalized) ||
    /^169\.254\./.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized)
  );
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function invalidCommand(message: string) {
  return botError("CRM_BOT_COMMAND_INVALID", message, 422);
}
