import type { OlxCapabilityResult } from "../../domains/marketplace/ports/marketplaceOlxCrmOnboarding.js";

export function olxProviderConnectionMetadata(chat: OlxCapabilityResult) {
  const ready = chat.status === "active";
  return {
    capabilities: {
      inbound: ready,
      outbound: ready,
      scheduling: false,
      templates: false,
    },
    connected: ready,
    degraded: chat.status === "error",
    errorCode: ready ? null : chat.reason,
    operationalStatus: { reason: chat.reason, status: chat.status },
    source: "marketplace_oauth",
  };
}
