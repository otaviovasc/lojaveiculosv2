import type { SafeAuditMetadata } from "@lojaveiculosv2/audit";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { FiscalDocumentNotFoundError } from "../../domain/fiscalErrors.js";
import type { FiscalDocument } from "../../ports/fiscalRepository.js";
import {
  requireFiscalScope,
  type FiscalServicePorts,
} from "./serviceSupport.js";

export type RepeatFiscalDocumentInput = {
  documentId: string;
};

export async function repeatFiscalDocument(
  context: ServiceContext,
  input: RepeatFiscalDocumentInput,
  ports: FiscalServicePorts,
): Promise<FiscalDocument> {
  assertPermission(context, "fiscal.manage");
  assertPermission(context, "fiscal.document.issue");
  const scope = requireFiscalScope(context);
  const source = await ports.fiscalRepository.getDocument({
    documentId: input.documentId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!source) throw new FiscalDocumentNotFoundError(input.documentId);

  context.logger.info(
    "fiscal.document.repeat.started",
    createServiceLogMetadata(context, {
      documentId: source.id,
      documentKind: source.documentKind,
      documentType: source.documentType,
    }),
  );

  const document = await ports.fiscalRepository.createDocument({
    documentKind: source.documentKind,
    documentType: source.documentType,
    metadata: createRepeatMetadata(source),
    recipientId: source.recipientId,
    status: "draft",
    storeId: scope.storeId,
    templateId: source.templateId,
    templateVersion: source.templateVersion,
    tenantId: scope.tenantId,
  });

  await ports.fiscalRepository.createDocumentSnapshot({
    actorId: context.actor.id,
    fiscalDocumentId: document.id,
    providerPayload: {
      documentKind: source.documentKind,
      documentType: source.documentType,
      metadata: source.metadata,
      repeatedFromDocumentId: source.id,
      recipientId: source.recipientId,
      templateId: source.templateId,
      templateVersion: source.templateVersion,
    },
    renderedDescription:
      typeof source.metadata.renderedDescription === "string"
        ? source.metadata.renderedDescription
        : null,
    snapshotType: "repeat_draft_created",
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  await auditRepeat(context, scope, "succeeded", {
    documentId: document.id,
    repeatedFromDocumentId: source.id,
  });
  return document;
}

function createRepeatMetadata(source: FiscalDocument) {
  const { providerStatus: _providerStatus, ...metadata } = source.metadata;
  return {
    ...metadata,
    repeatedFromDocumentId: source.id,
    repeatRequiresReview: true,
    sourceDocumentStatus: source.status,
    sourceProviderDocumentId: source.providerDocumentId,
    sourceTemplateVersion: source.templateVersion,
  };
}

async function auditRepeat(
  context: ServiceContext,
  scope: { storeId: string; tenantId: string },
  outcome: "failed" | "succeeded",
  metadata: SafeAuditMetadata,
) {
  await context.audit.record({
    action: "fiscal.document.repeat_draft",
    actor: context.actor,
    category: "integration",
    criticality: "high",
    entityId: String(metadata.documentId ?? scope.storeId),
    entityType: "fiscal_document",
    metadata,
    outcome,
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Created repeat fiscal document draft",
  });
}
