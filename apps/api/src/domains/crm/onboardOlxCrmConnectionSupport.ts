import type { CrmConnection } from "./ports/crmConnectionRepository.js";
import type {
  OlxCapabilityResult,
  OlxCrmOnboardingResult,
} from "../marketplace/ports/marketplaceOlxCrmOnboarding.js";

export const OLX_CRM_CONNECTION_SETUP_PERMISSION =
  "crm.messaging.connection.setup" as const;

export function assertFinishedOlxSetup(
  connection: CrmConnection | null,
  setupStatus: string,
): asserts connection is NonNullable<typeof connection> {
  if (
    !connection ||
    readRecord(connection.metadata.webhookSetup).status !== setupStatus
  ) {
    throw new Error("OLX webhook setup lease was lost before completion.");
  }
}

export async function configureOlxCapability(
  requiredScope: string,
  scopes: readonly string[],
  capability: OlxCapabilityResult["capability"],
  configure: () => Promise<void>,
  onError?: (error: unknown) => void,
): Promise<OlxCapabilityResult> {
  if (!scopes.includes(requiredScope)) {
    return {
      capability,
      grantState: "denied",
      reason: "missing_scope",
      status: "blocked",
    };
  }
  try {
    await configure();
    return {
      capability,
      grantState: "granted",
      reason: null,
      status: "active",
    };
  } catch (error) {
    onError?.(error);
    return {
      capability,
      grantState: "granted",
      reason: "provider_rejected",
      status: "error",
    };
  }
}

export function buildOlxOnboardingResult(
  connectionId: string,
  capabilities: OlxCrmOnboardingResult["capabilities"],
): OlxCrmOnboardingResult {
  const statuses = Object.values(capabilities).map(({ status }) => status);
  return {
    capabilities,
    connectionId,
    status: statuses.every((status) => status === "active")
      ? "active"
      : statuses.some((status) => status === "active")
        ? "degraded"
        : "error",
  };
}

export function readOlxOnboardingResult(
  connection: CrmConnection,
  scopes: readonly string[],
): OlxCrmOnboardingResult {
  const stored = readRecord(
    readRecord(connection.metadata.webhookSetup).capabilities,
  );
  const fallback = (
    scope: string,
    capability: OlxCapabilityResult["capability"],
  ): OlxCapabilityResult =>
    scopes.includes(scope)
      ? {
          capability,
          grantState: "granted",
          reason: "provider_rejected",
          status: "error",
        }
      : {
          capability,
          grantState: "denied",
          reason: "missing_scope",
          status: "blocked",
        };
  const capabilities = {
    chat: scopes.includes("chat")
      ? (readCapability(stored.chat) ?? fallback("chat", "messaging"))
      : fallback("chat", "messaging"),
    leads: scopes.includes("autoservice")
      ? (readCapability(stored.leads) ??
        fallback("autoservice", "lead_ingestion"))
      : fallback("autoservice", "lead_ingestion"),
  };
  return buildOlxOnboardingResult(connection.id, capabilities);
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readCapability(value: unknown): OlxCapabilityResult | null {
  const record = readRecord(value);
  if (
    !["inventory_sync", "lead_ingestion", "messaging"].includes(
      String(record.capability),
    ) ||
    !["denied", "granted"].includes(String(record.grantState)) ||
    !["active", "blocked", "error"].includes(String(record.status)) ||
    ![null, "missing_scope", "provider_rejected"].includes(
      (record.reason ?? null) as null,
    )
  )
    return null;
  return record as OlxCapabilityResult;
}
