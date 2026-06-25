import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { ObjectUpload } from "../../../../shared/storage/objectStorage.js";
import type {
  DocumentKind,
  LinkedDocument,
} from "../../../documents/ports/documentRepository.js";
import type {
  FinanceEntryStatus,
  FinanceEntryType,
  FinanceLinkTarget,
  FinanceEntryBundle,
} from "../../ports/financeRepository.js";
import {
  actorUserId,
  auditFinanceServiceEvent,
  financeEntryStorageScope,
  getDocumentRepository,
  getFinanceRepository,
  getObjectStorage,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.create";
const attachDocumentPermission = "finance.attach_document";

export type CreateFinanceEntryDocumentUploadInput = {
  contentType: string;
  fileName: string;
  kind?: DocumentKind | undefined;
  linkRole?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  sizeBytes: number;
  title?: string | undefined;
};

export type CreateFinanceEntryInput = {
  amountCents: number;
  category: string;
  documentUpload?: CreateFinanceEntryDocumentUploadInput | undefined;
  dueAt?: Date | null;
  links?: readonly {
    targetId: string;
    targetType: FinanceLinkTarget;
  }[];
  metadata?: Record<string, unknown>;
  name: string;
  paidAt?: Date | null;
  sellerUserId?: string | null;
  status: FinanceEntryStatus;
  type: FinanceEntryType;
};

export type CreateFinanceEntryResult = FinanceEntryBundle & {
  documentUpload?: ObjectUpload | undefined;
  documents: readonly LinkedDocument[];
};

export async function createFinanceEntry(
  context: ServiceContext,
  input: CreateFinanceEntryInput,
  ports?: FinanceServicePorts,
): Promise<CreateFinanceEntryResult> {
  assertPermission(context, permission);
  if (input.documentUpload) assertPermission(context, attachDocumentPermission);
  const scope = requireFinanceScope(context);

  logFinanceServiceEvent(context, "finance_entry.create.started", {
    amountCents: input.amountCents,
    category: input.category,
    status: input.status,
    type: input.type,
  });

  const bundle = await getFinanceRepository(ports).createEntry({
    amountCents: input.amountCents,
    category: input.category,
    dueAt: input.dueAt ?? null,
    links: input.links ?? [],
    metadata: input.metadata ?? {},
    name: input.name,
    paidAt: input.paidAt ?? null,
    sellerUserId: input.sellerUserId ?? null,
    status: input.status,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    type: input.type,
  });
  const documentResult = input.documentUpload
    ? await createEntryDocumentUpload(
        context,
        scope,
        bundle,
        input.documentUpload,
        ports,
      )
    : { documents: [] };

  await auditFinanceServiceEvent(context, {
    action: "finance_entry.create",
    category: "data_change",
    entityId: bundle.entry.id,
    metadata: {
      amountCents: bundle.entry.amountCents,
      category: bundle.entry.category,
      documentCount: documentResult.documents.length,
      linkCount: bundle.links.length,
      status: bundle.entry.status,
      type: bundle.entry.type,
    },
    permission,
    relatedEntities: bundle.links.map((link) => ({
      id: link.targetId,
      type: link.targetType,
    })),
    summary: "Created finance entry",
  });

  return { ...bundle, ...documentResult };
}

async function createEntryDocumentUpload(
  context: ServiceContext,
  scope: { storeId: string; tenantId: string },
  bundle: FinanceEntryBundle,
  input: CreateFinanceEntryDocumentUploadInput,
  ports?: FinanceServicePorts,
): Promise<{
  documentUpload: ObjectUpload;
  documents: readonly LinkedDocument[];
}> {
  const documentUpload = await getObjectStorage(ports).createUpload({
    contentType: input.contentType,
    fileName: input.fileName,
    scopeSegments: financeEntryStorageScope(scope, bundle.entry.id),
    sizeBytes: input.sizeBytes,
  });
  const document = await getDocumentRepository(ports).create({
    createdByUserId: actorUserId(context),
    fileName: input.fileName,
    fileSizeBytes: input.sizeBytes,
    kind: input.kind ?? "finance_receipt",
    linkRole: input.linkRole ?? "receipt",
    metadata: {
      financeEntryType: bundle.entry.type,
      source: "finance_entry_create",
      ...(input.metadata ?? {}),
    },
    mimeType: input.contentType,
    status: "draft",
    storageKey: documentUpload.storageKey,
    storeId: scope.storeId,
    targetId: bundle.entry.id,
    targetType: "finance_entry",
    tenantId: scope.tenantId,
    title: input.title ?? input.fileName,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_document.create_upload_and_attach",
    category: "data_change",
    entityId: document.id,
    entityType: "finance_document",
    metadata: {
      entryId: bundle.entry.id,
      kind: document.kind,
      sizeBytes: input.sizeBytes,
      storageKey: document.storageKey,
    },
    permission: attachDocumentPermission,
    relatedEntities: [{ id: bundle.entry.id, type: "finance_entry" }],
    summary: "Created finance document upload and attached draft document",
  });

  return { documentUpload, documents: [document] };
}
