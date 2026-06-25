import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { LinkedDocument } from "../../../documents/ports/documentRepository.js";
import type { FinanceEntryBundle } from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  findScopedFinanceEntry,
  getDocumentRepository,
  getFinanceRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.read";

export type GetFinanceEntryDetailInput = {
  entryId: string;
};

export type FinanceEntryDetail = FinanceEntryBundle & {
  documents: readonly LinkedDocument[];
};

export async function getFinanceEntryDetail(
  context: ServiceContext,
  input: GetFinanceEntryDetailInput,
  ports?: FinanceServicePorts,
): Promise<FinanceEntryDetail> {
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);
  const bundle = await findScopedFinanceEntry(
    context,
    getFinanceRepository(ports),
    input.entryId,
  );
  const documents = await getDocumentRepository(ports).listByTarget({
    ...scope,
    targetId: bundle.entry.id,
    targetType: "finance_entry",
  });

  logFinanceServiceEvent(context, "finance_entry.detail.read", {
    documentCount: documents.length,
    entryId: bundle.entry.id,
    linkCount: bundle.links.length,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_entry.detail.read",
    category: "data_access",
    entityId: bundle.entry.id,
    metadata: {
      documentCount: documents.length,
      linkCount: bundle.links.length,
    },
    permission,
    summary: "Read finance entry detail",
  });

  return { ...bundle, documents };
}
