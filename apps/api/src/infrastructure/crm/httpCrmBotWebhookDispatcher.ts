import type {
  CrmBotWebhookDispatcher,
  DispatchCrmBotWebhookInput,
} from "../../domains/crm/ports/crmBotWebhookDispatcher.js";

export function createHttpCrmBotWebhookDispatcher(
  env: Record<string, string | undefined>,
): CrmBotWebhookDispatcher {
  return {
    actionApiBaseUrl: resolveActionApiBaseUrl(env),
    dispatch: dispatchCrmBotWebhook,
  };
}

async function dispatchCrmBotWebhook(input: DispatchCrmBotWebhookInput) {
  const body = JSON.stringify(input.payload);
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "LojaVeiculos-CRM/2.0",
    "X-Idempotency-Key": input.idempotencyKey,
    "X-Webhook-Secret": input.webhookSecret,
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(input.webhookUrl, {
        body,
        headers,
        method: "POST",
        signal: timeoutSignal(10_000),
      });
      if (response.ok) return;
      lastError = new Error(`Bot webhook failed with ${response.status}.`);
      if (response.status < 500) break;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Bot webhook dispatch failed.");
}

function resolveActionApiBaseUrl(env: Record<string, string | undefined>) {
  const apiBase =
    trimTrailingSlash(env.API_BASE_URL) ?? "http://localhost:8787";
  return `${apiBase}/api/v1/crm/whatsapp/integrations/bot/actions`;
}

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs).unref?.();
  return controller.signal;
}

function trimTrailingSlash(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, "") : undefined;
}
