import type {
  CrmPushDeliveryProvider,
  CrmPushDeliveryRequest,
  CrmPushDeliveryResult,
} from "../../domains/crm/ports/crmPushDeliveryProvider.js";

const ONESIGNAL_NOTIFICATIONS_URL =
  "https://api.onesignal.com/notifications?c=push";
const MAX_ONESIGNAL_RESPONSE_BYTES = 64 * 1024;

export type OneSignalHttpClientOptions = {
  apiKey: string;
  appId: string;
  fetch?: typeof fetch;
  requestTimeoutMs: number;
};

export function createOneSignalHttpClient(
  options: OneSignalHttpClientOptions,
): CrmPushDeliveryProvider {
  const request = options.fetch ?? globalThis.fetch;
  return {
    async send(input) {
      let response: Response;
      try {
        response = await request(ONESIGNAL_NOTIFICATIONS_URL, {
          body: JSON.stringify(toOneSignalPayload(options.appId, input)),
          headers: {
            Authorization: `Key ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(options.requestTimeoutMs),
        });
      } catch (error) {
        return {
          errorCode: isTimeout(error)
            ? "onesignal_request_timeout"
            : "onesignal_network_failure",
          kind: "retryable_failure",
        };
      }

      const parsed = await readJsonRecord(response);
      if (parsed.errorCode) {
        return {
          errorCode: parsed.errorCode,
          kind: "retryable_failure",
        };
      }
      const body = parsed.body;
      const invalidSubscriptionIds = readInvalidSubscriptionIds(body);
      if (response.ok) {
        const providerNotificationId = readString(body?.id);
        if (!providerNotificationId) {
          if (invalidSubscriptionIds.length) {
            return {
              errorCode: "onesignal_invalid_subscriptions",
              invalidSubscriptionIds,
              kind: "permanent_failure",
            };
          }
          return {
            errorCode: "onesignal_missing_notification_id",
            kind: "retryable_failure",
          };
        }
        return {
          invalidSubscriptionIds,
          kind: "accepted",
          providerNotificationId,
        };
      }

      if (response.status === 429 || response.status >= 500) {
        const retryAfterMs = readRetryAfterMs(
          response.headers.get("retry-after"),
        );
        return {
          errorCode: `onesignal_http_${response.status}`,
          kind: "retryable_failure",
          ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
        };
      }

      return {
        errorCode: `onesignal_http_${response.status}`,
        invalidSubscriptionIds,
        kind: "permanent_failure",
      };
    },
  };
}

export function createShadowCrmPushDeliveryProvider(): CrmPushDeliveryProvider {
  return {
    async send(input) {
      return {
        invalidSubscriptionIds: [],
        kind: "accepted",
        providerNotificationId: `shadow:${input.idempotencyKey}`,
      };
    },
  };
}

function toOneSignalPayload(appId: string, input: CrmPushDeliveryRequest) {
  return {
    app_id: appId,
    chrome_web_icon: input.iconUrl,
    contents: { en: input.body },
    data: input.data,
    firefox_icon: input.iconUrl,
    headings: { en: input.heading },
    idempotency_key: input.idempotencyKey,
    include_subscription_ids: input.subscriptionIds,
    target_channel: "push",
    ttl: input.ttlSeconds,
    web_url: input.webUrl,
    web_push_topic: input.topic,
  };
}

type JsonReadResult = {
  body: Record<string, unknown> | null;
  errorCode: string | null;
};

async function readJsonRecord(response: Response): Promise<JsonReadResult> {
  const contentLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_ONESIGNAL_RESPONSE_BYTES
  ) {
    await response.body?.cancel().catch(() => undefined);
    return { body: null, errorCode: "onesignal_response_too_large" };
  }
  if (!response.body) return { body: null, errorCode: null };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      totalBytes += next.value.byteLength;
      if (totalBytes > MAX_ONESIGNAL_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { body: null, errorCode: "onesignal_response_too_large" };
      }
      chunks.push(next.value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return { body: null, errorCode: "onesignal_response_read_failure" };
  }
  try {
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return { body: isRecord(body) ? body : null, errorCode: null };
  } catch {
    return { body: null, errorCode: null };
  }
}

function readInvalidSubscriptionIds(
  body: Record<string, unknown> | null,
): readonly string[] {
  if (!body) return [];
  const direct = readStringArray(body.invalid_subscription_ids);
  const errors = isRecord(body.errors) ? body.errors : null;
  const legacy = errors ? readStringArray(errors.invalid_player_ids) : [];
  const current = errors
    ? readStringArray(errors.invalid_subscription_ids)
    : [];
  return [...new Set([...direct, ...legacy, ...current])];
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => (typeof item === "string" ? [item] : []))
    : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function readRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return undefined;
  return Math.max(0, date - Date.now());
}
