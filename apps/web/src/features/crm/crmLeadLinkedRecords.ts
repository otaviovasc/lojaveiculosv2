import { createDocumentsApi } from "../documents/apiClient";
import { createDocumentsApiOptions } from "../documents/runtimeApi";
import type { WorkspaceDocument } from "../documents/types";
import { createSalesApi } from "../sales/apiClient";
import { createSalesApiOptions } from "../sales/runtimeApi";
import type { SaleRecord } from "../sales/types";

export type CrmLeadLinkedRecordsState = {
  documents: readonly WorkspaceDocument[];
  kind: "error" | "loading" | "ready";
  message?: string;
  sales: readonly SaleRecord[];
};

export const emptyCrmLeadLinkedRecords: CrmLeadLinkedRecordsState = {
  documents: [],
  kind: "loading",
  sales: [],
};

export async function loadCrmLeadLinkedRecords(
  leadId: string,
): Promise<CrmLeadLinkedRecordsState> {
  const salesApi = createSalesApi(await createSalesApiOptions());
  const documentsApi = createDocumentsApi(await createDocumentsApiOptions());
  const sales = await salesApi.list({ leadId, status: "all" });
  const saleDocumentRequests = sales.flatMap((sale) => [
    documentsApi.listDocuments({
      limit: 50,
      targetId: sale.id,
      targetType: "sale",
    }),
    ...(sale.unitId
      ? [
          documentsApi.listDocuments({
            limit: 50,
            targetId: sale.unitId,
            targetType: "vehicle_unit",
          }),
        ]
      : []),
  ]);
  const documentPages = await Promise.all([
    documentsApi.listDocuments({
      limit: 50,
      targetId: leadId,
      targetType: "lead",
    }),
    ...saleDocumentRequests,
  ]);

  return {
    documents: uniqueDocuments(documentPages.flat()),
    kind: "ready",
    sales,
  };
}

function uniqueDocuments(documents: readonly WorkspaceDocument[]) {
  const byId = new Map<string, WorkspaceDocument>();
  for (const document of documents) byId.set(document.id, document);
  return [...byId.values()].sort(
    (left, right) =>
      new Date(right.uploadedAt).getTime() -
      new Date(left.uploadedAt).getTime(),
  );
}

export function findResumableLeadSaleId(
  sales: readonly SaleRecord[],
): string | null {
  const resumable = sales.filter(
    (sale) =>
      sale.isCurrentRevision &&
      (sale.status === "draft" || sale.status === "pending"),
  );
  if (!resumable.length) return null;
  return resumable.sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )[0]!.id;
}
