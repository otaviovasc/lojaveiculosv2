import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { buildDocumentPreview } from "../../../documents/preview/documentPreview.js";
import { renderDocumentPreviewPdf } from "../../../documents/render/documentPreviewPdf.js";
import type { LinkedDocument } from "../../../documents/ports/documentRepository.js";
import {
  buildFinanceEntryReceiptMetadata,
  buildFinanceEntryReceiptPreview,
} from "../../documents/financeEntryReceiptDocument.js";
import {
  actorUserId,
  auditFinanceServiceEvent,
  financeEntryStorageScope,
  findScopedFinanceEntry,
  getDocumentRepository,
  getFinanceRepository,
  getFinanceStoreIdentityReader,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";
import { FinanceDocumentStorageUnavailableError } from "./getFinanceEntryDocumentDownload.js";

const permission = "finance.attach_document";
const readPermission = "finance.read";
const templateKey = "finance_entry_receipt";

export type GenerateFinanceEntryReceiptResult = {
  document: LinkedDocument;
  generated: boolean;
};

export class FinanceStoreIdentityUnavailableError extends Error {
  constructor() {
    super("Store identity is unavailable for finance receipt generation.");
    this.name = "FinanceStoreIdentityUnavailableError";
  }
}

export async function generateFinanceEntryReceipt(
  context: ServiceContext,
  input: { entryId: string },
  ports?: FinanceServicePorts,
): Promise<GenerateFinanceEntryReceiptResult> {
  assertPermission(context, readPermission);
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);
  const bundle = await findScopedFinanceEntry(
    context,
    getFinanceRepository(ports),
    input.entryId,
  );
  const documentRepository = getDocumentRepository(ports);
  const existing = (
    await documentRepository.listByTarget({
      ...scope,
      targetId: bundle.entry.id,
      targetType: "finance_entry",
    })
  ).find(isGeneratedFinanceReceipt);

  if (existing) {
    if (existing.status === "archived" || existing.status === "voided") {
      const revived = await documentRepository.update({
        documentId: existing.id,
        status: "issued",
        ...scope,
      });
      logFinanceServiceEvent(context, "finance_entry.receipt.revived", {
        documentId: revived.id,
        entryId: bundle.entry.id,
        previousStatus: existing.status,
      });
      await auditFinanceServiceEvent(context, {
        action: "finance_entry.receipt.revive",
        category: "data_change",
        entityId: revived.id,
        entityType: "finance_document",
        metadata: {
          entryId: bundle.entry.id,
          previousStatus: existing.status,
          templateKey,
        },
        permission,
        relatedEntities: [{ id: bundle.entry.id, type: "finance_entry" }],
        summary: "Revived generated finance entry receipt",
      });
      return { document: revived, generated: false };
    }
    logFinanceServiceEvent(context, "finance_entry.receipt.reused", {
      documentId: existing.id,
      entryId: bundle.entry.id,
    });
    await auditFinanceServiceEvent(context, {
      action: "finance_entry.receipt.reuse",
      category: "data_access",
      entityId: existing.id,
      entityType: "finance_document",
      metadata: { entryId: bundle.entry.id, templateKey },
      permission,
      relatedEntities: [{ id: bundle.entry.id, type: "finance_entry" }],
      summary: "Reused generated finance entry receipt",
    });
    return { document: existing, generated: false };
  }

  const storeIdentity =
    await getFinanceStoreIdentityReader(ports).findByStore(scope);
  if (!storeIdentity?.name.trim()) {
    throw new FinanceStoreIdentityUnavailableError();
  }

  const template = await documentRepository.findTemplate({
    kind: "finance_receipt",
    ...scope,
    templateKey,
  });
  const now = new Date();
  const fileName = `recibo-${bundle.entry.id}.pdf`;
  const metadata = buildFinanceEntryReceiptMetadata(
    bundle.entry,
    template,
    now,
    storeIdentity.name,
  );
  const draftDocument = buildFinanceEntryReceiptPreview({
    entryId: bundle.entry.id,
    fileName,
    metadata,
    now,
    scope,
  });
  const body = await renderDocumentPreviewPdf(
    buildDocumentPreview(draftDocument),
  );
  if (!ports?.objectStorage) {
    throw new FinanceDocumentStorageUnavailableError();
  }
  const object = await ports.objectStorage.putObject({
    body,
    contentType: "application/pdf",
    fileName,
    scopeSegments: [
      ...financeEntryStorageScope(scope, bundle.entry.id),
      "generated",
      crypto.randomUUID(),
    ],
  });
  const document = await documentRepository.create({
    createdByUserId: actorUserId(context),
    fileName,
    fileSizeBytes: body.byteLength,
    kind: "finance_receipt",
    linkRole: templateKey,
    metadata,
    mimeType: "application/pdf",
    status: "issued",
    storageKey: object.storageKey,
    ...scope,
    targetId: bundle.entry.id,
    targetType: "finance_entry",
    title: template?.title ?? "Recibo de lançamento financeiro",
  });

  logFinanceServiceEvent(context, "finance_entry.receipt.generated", {
    documentId: document.id,
    entryId: bundle.entry.id,
    status: bundle.entry.status,
  });
  await auditFinanceServiceEvent(context, {
    action: "finance_entry.receipt.generate",
    category: "data_change",
    entityId: document.id,
    entityType: "finance_document",
    metadata: {
      entryId: bundle.entry.id,
      entryStatus: bundle.entry.status,
      fileSizeBytes: body.byteLength,
      templateKey,
    },
    permission,
    relatedEntities: [{ id: bundle.entry.id, type: "finance_entry" }],
    summary: "Generated finance entry receipt",
  });

  return { document, generated: true };
}

function isGeneratedFinanceReceipt(document: LinkedDocument) {
  return (
    document.kind === "finance_receipt" &&
    document.linkRole === templateKey &&
    document.metadata.templateKey === templateKey &&
    document.targetType === "finance_entry"
  );
}
