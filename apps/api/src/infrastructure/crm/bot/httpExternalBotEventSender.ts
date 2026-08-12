import type { ExternalBotEventSender } from "./externalBotEventOutboxDispatcher.js";

export function createHttpExternalBotEventSender(input: {
  fetch?: typeof fetch;
  url: string;
}): ExternalBotEventSender {
  const fetchImpl = input.fetch ?? fetch;
  return {
    send: async (request) => {
      try {
        const response = await fetchImpl(input.url, {
          body: request.body,
          headers: request.headers,
          method: "POST",
          signal: AbortSignal.timeout(10_000),
        });
        if (response.ok) return { kind: "delivered" };
        return {
          code: `http_${response.status}`,
          kind: "failed",
          retryable: response.status === 429 || response.status >= 500,
        };
      } catch {
        return { code: "network_error", kind: "failed", retryable: true };
      }
    },
  };
}
