import type { CrmMessagingGateway } from "../../../domains/crm/ports/crmMessagingGateway.js";
import {
  ExternalBotCanonicalSyncIndeterminateError,
  type AuthorizedExternalBotEffect,
} from "../../db/crm/drizzleExternalBotEffectRuntime.js";
import type { ExternalBotProviderEffectExecutor } from "./runExternalBotEffectWorker.js";

export function sendProviderCommand(
  gateway: Pick<CrmMessagingGateway, "sendMedia" | "sendTemplate" | "sendText">,
  connection: Parameters<CrmMessagingGateway["sendText"]>[0],
  effect: AuthorizedExternalBotEffect,
) {
  if (effect.command.action === "handoff.request") {
    throw Object.assign(new Error("Handoff has no provider operation."), {
      code: "configuration_error",
    });
  }
  if (effect.command.action === "message.send_text") {
    return gateway.sendText(connection, {
      phone: effect.providerAddress,
      text: effect.command.payload.text,
    });
  }
  if (effect.command.action === "message.send_media") {
    return gateway.sendMedia(connection, {
      ...(effect.command.payload.caption
        ? { caption: effect.command.payload.caption }
        : {}),
      mediaType: effect.command.payload.mediaType as
        "audio" | "document" | "image" | "video",
      mediaUrl: effect.command.payload.mediaUrl,
      phone: effect.providerAddress,
    });
  }
  return gateway.sendTemplate(connection, {
    components: [
      {
        parameters: Object.entries(effect.command.payload.variables)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([, value]) => ({ text: value, type: "text" as const })),
        type: "body",
      },
    ],
    languageCode: "pt_BR",
    name: effect.command.payload.templateName,
    phone: effect.providerAddress,
  });
}

export function toProviderOperation(input: {
  externalId: string;
  providerTimestamp: Date;
}) {
  return { id: input.externalId, occurredAt: input.providerTimestamp };
}

export function failureCode(error: unknown) {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "effect_failed";
}

export function providerFailure(
  error: unknown,
): Awaited<ReturnType<ExternalBotProviderEffectExecutor["execute"]>> {
  const record = error as { code?: unknown; status?: unknown };
  const code = failureCode(error);
  if (
    error instanceof ExternalBotCanonicalSyncIndeterminateError ||
    (error instanceof Error &&
      error.message ===
        "CRM WhatsApp delivery outcome is pending reconciliation.")
  ) {
    return { code: "delivery_indeterminate", kind: "indeterminate" };
  }
  if (code === "timeout" || code === "request_failed") {
    return { code, kind: "indeterminate" };
  }
  if (
    code === "configuration_error" ||
    code === "media_preparation_conflict" ||
    code === "provider_rejected" ||
    code === "validation_failed"
  ) {
    return permanentFailure(code);
  }
  if (
    code === "rate_limited" ||
    code === "provider_unavailable" ||
    record.status === 429 ||
    (typeof record.status === "number" && record.status >= 500)
  ) {
    return { code, kind: "failed", retryable: true };
  }
  return permanentFailure(code);
}

export function permanentFailure(code: string) {
  return { code, kind: "failed", retryable: false } as const;
}
