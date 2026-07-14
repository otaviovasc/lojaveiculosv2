import { createTestDocumentRepository } from "../documents/testSupportDocumentRepository.js";
import { createServiceContext } from "../../shared/serviceContext.js";
import { createTestFinanceAutoEntryRepository } from "./testSupportFinanceAutoEntryRepository.js";
import { createTestFinanceRepository } from "./testSupportFinanceRepository.js";
import type { MaterializeFinanceAutoEntryPorts } from "./services/FinanceService/materializeFinanceAutoEntries.js";
import type { FinanceServicePorts } from "./services/FinanceService/serviceSupport.js";

export const saleId = "10000000-0000-4000-8000-000000000001";
export const sellerId = "10000000-0000-4000-8000-000000000002";
export const unitId = "10000000-0000-4000-8000-000000000003";
export const leadId = "10000000-0000-4000-8000-000000000004";
export const fixedRecipientId = "10000000-0000-4000-8000-000000000005";

export function createMaterializationPorts() {
  return {
    documentRepository: createTestDocumentRepository(),
    financeAutoEntryRepository: createTestFinanceAutoEntryRepository(),
    financeRepository: createTestFinanceRepository(),
  } satisfies FinanceServicePorts & MaterializeFinanceAutoEntryPorts;
}

export function financeAutoEntryContext(permissions: string[]) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions,
    request: { requestId: "request_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}
