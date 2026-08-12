import type { AuditSink } from "@lojaveiculosv2/audit";
import { vi } from "vitest";
import type { ServiceContext } from "../../../shared/serviceContext.js";

export function retentionItem(
  id: string,
  category: "bot_interaction" | "canonical_message" | "provider_raw_payload",
  eligibleAt: string,
  cycleClosed?: boolean,
) {
  return {
    category,
    ...(cycleClosed === undefined ? {} : { cycleClosed }),
    eligibleAt: new Date(`${eligibleAt}T00:00:00.000Z`),
    id,
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}

export function createRetentionContext(
  audit: AuditSink = { record: vi.fn(async () => undefined) },
  logger: ServiceContext["logger"] = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
): ServiceContext {
  return {
    actor: { id: "crm_retention_worker", kind: "system" },
    audit,
    logger,
    permissions: ["crm.manage"],
    requestId: "retention_request_1",
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
