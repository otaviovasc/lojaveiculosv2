import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { ObjectUpload } from "../../../../shared/storage/objectStorage.js";
import {
  auditFinanceServiceEvent,
  financeEntryStorageScope,
  findScopedFinanceEntry,
  getFinanceRepository,
  getObjectStorage,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.attach_document";

export type RequestFinanceEntryDocumentUploadInput = {
  contentType: string;
  entryId: string;
  fileName: string;
  sizeBytes: number;
};

export async function requestFinanceEntryDocumentUpload(
  context: ServiceContext,
  input: RequestFinanceEntryDocumentUploadInput,
  ports?: FinanceServicePorts,
): Promise<ObjectUpload> {
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);
  const bundle = await findScopedFinanceEntry(
    context,
    getFinanceRepository(ports),
    input.entryId,
  );

  logFinanceServiceEvent(context, "finance_document.upload.requested", {
    contentType: input.contentType,
    entryId: bundle.entry.id,
    sizeBytes: input.sizeBytes,
  });

  const upload = await getObjectStorage(ports).createUpload({
    contentType: input.contentType,
    fileName: input.fileName,
    scopeSegments: financeEntryStorageScope(scope, bundle.entry.id),
    sizeBytes: input.sizeBytes,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_document.upload.request",
    category: "data_change",
    entityId: bundle.entry.id,
    metadata: {
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      storageKey: upload.storageKey,
      uploadCorrelationId: context.requestId,
    },
    permission,
    summary: "Requested finance document upload URL",
  });

  return upload;
}
