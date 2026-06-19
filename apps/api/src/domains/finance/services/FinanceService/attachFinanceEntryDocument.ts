import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  DocumentKind,
  LinkedDocument,
} from "../../../documents/ports/documentRepository.js";
import {
  actorUserId,
  auditFinanceServiceEvent,
  financeEntryStoragePrefix,
  findScopedFinanceEntry,
  getDocumentRepository,
  getFinanceRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.attach_document";

export type AttachFinanceEntryDocumentInput = {
  entryId: string;
  fileName: string;
  fileSizeBytes?: number | null;
  kind: DocumentKind;
  linkRole?: string;
  mimeType?: string | null;
  storageKey: string;
  title: string;
};

export async function attachFinanceEntryDocument(
  context: ServiceContext,
  input: AttachFinanceEntryDocumentInput,
  ports?: FinanceServicePorts,
): Promise<LinkedDocument> {
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);
  const bundle = await findScopedFinanceEntry(
    context,
    getFinanceRepository(ports),
    input.entryId,
  );
  assertStorageScope(scope, bundle.entry.id, input.storageKey);

  logFinanceServiceEvent(context, "finance_document.attach.started", {
    entryId: bundle.entry.id,
    kind: input.kind,
    storageKey: input.storageKey,
  });

  const document = await getDocumentRepository(ports).create({
    createdByUserId: actorUserId(context),
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes ?? null,
    kind: input.kind,
    linkRole: input.linkRole ?? "receipt",
    metadata: {
      financeEntryType: bundle.entry.type,
      source: "finance_entry_attachment",
    },
    mimeType: input.mimeType ?? null,
    status: "draft",
    storageKey: input.storageKey,
    storeId: scope.storeId,
    targetId: bundle.entry.id,
    targetType: "finance_entry",
    tenantId: scope.tenantId,
    title: input.title,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_document.attach",
    category: "data_change",
    entityId: document.id,
    entityType: "finance_document",
    metadata: {
      entryId: bundle.entry.id,
      kind: document.kind,
      storageKey: document.storageKey,
    },
    permission,
    relatedEntities: [{ id: bundle.entry.id, type: "finance_entry" }],
    summary: "Attached finance document",
  });

  return document;
}

function assertStorageScope(
  scope: { storeId: string; tenantId: string },
  entryId: string,
  storageKey: string,
) {
  const prefix = `${financeEntryStoragePrefix(scope, entryId)}/`;
  if (!storageKey.startsWith(prefix)) {
    throw new FinanceDocumentStorageScopeError();
  }
}

export class FinanceDocumentStorageScopeError extends Error {
  constructor() {
    super("Finance document storage key is outside the scoped entry folder.");
    this.name = "FinanceDocumentStorageScopeError";
  }
}
