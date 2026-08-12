import type { OlxCapabilityResult } from "../ports/marketplaceOlxCrmOnboarding.js";
import type {
  MarketplaceAccount,
  MarketplaceProvider,
  MarketplaceProviderState,
} from "../ports/marketplaceRepository.js";

const grantStates = ["denied", "granted"] as const;
const statuses = ["active", "blocked", "error"] as const;
const reasons = [
  null,
  "access_denied",
  "missing_scope",
  "provider_rejected",
  "runtime_unavailable",
] as const;

export function readMarketplaceProviderCapabilities(
  provider: MarketplaceProvider,
  account: MarketplaceAccount | undefined,
): MarketplaceProviderState["capabilities"] {
  if (provider !== "olx" || !account) return null;
  const connection = readRecord(account.config.connection);
  const stored = readRecord(connection.olxCapabilities);
  const chat = readCapability(stored.chat, "messaging");
  const leads = readCapability(stored.leads, "lead_ingestion");
  const stock = readCapability(stored.stock, "inventory_sync");
  return chat && leads && stock ? { chat, leads, stock } : null;
}

function readCapability(
  value: unknown,
  expectedCapability: OlxCapabilityResult["capability"],
): OlxCapabilityResult | null {
  const record = readRecord(value);
  if (
    record.capability !== expectedCapability ||
    !grantStates.includes(record.grantState as never) ||
    !statuses.includes(record.status as never) ||
    !reasons.includes((record.reason ?? null) as never)
  ) {
    return null;
  }
  return record as OlxCapabilityResult;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
