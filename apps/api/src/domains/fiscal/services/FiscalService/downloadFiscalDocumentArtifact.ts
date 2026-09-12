import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  FiscalArtifactUnavailableError,
  type FiscalArtifactFormat,
} from "../../ports/fiscalProviderGateway.js";
import type { FiscalDocument } from "../../ports/fiscalRepository.js";
import {
  FiscalDocumentNotFoundError,
  requireFiscalScope,
  type FiscalServicePorts,
} from "./serviceSupport.js";

export type DownloadFiscalDocumentArtifactInput = {
  documentId: string;
  format: FiscalArtifactFormat;
};

export type FiscalDocumentArtifactDownload = {
  bytes: Uint8Array;
  contentType: "application/pdf" | "application/xml";
  fileName: string;
};

export async function downloadFiscalDocumentArtifact(
  context: ServiceContext,
  input: DownloadFiscalDocumentArtifactInput,
  ports: FiscalServicePorts,
): Promise<FiscalDocumentArtifactDownload> {
  assertPermission(context, "fiscal.manage");
  assertPermission(context, "documents.download");
  const scope = requireFiscalScope(context);
  const document = await ports.fiscalRepository.findDocumentById({
    documentId: input.documentId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  if (!document) {
    throw new FiscalDocumentNotFoundError(input.documentId);
  }

  context.logger.info(
    "fiscal.document.artifact_download.started",
    createServiceLogMetadata(context, {
      documentId: document.id,
      format: input.format,
    }),
  );

  try {
    if (!isOfficialArtifactEligible(document)) {
      throw new FiscalArtifactUnavailableError(input.format);
    }
    const artifact = await ports.fiscalProviderGateway.downloadDocumentArtifact(
      {
        documentKind: document.documentKind,
        format: input.format,
        providerDocumentId: document.providerDocumentId,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      },
    );
    await recordDownloadAudit(context, document, input.format, "succeeded");
    return {
      ...artifact,
      fileName: createOfficialArtifactFileName(document, input.format),
    };
  } catch (error) {
    await recordDownloadAudit(context, document, input.format, "failed");
    throw error;
  }
}

function isOfficialArtifactEligible(
  document: FiscalDocument,
): document is FiscalDocument & { providerDocumentId: string } {
  return (
    Boolean(document.providerDocumentId) &&
    ["authorized", "cancelled", "issued"].includes(document.status)
  );
}

function createOfficialArtifactFileName(
  document: FiscalDocument,
  format: FiscalArtifactFormat,
) {
  const date = (document.issuedAt ?? document.createdAt)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  const accessKeySuffix = document.accessKey?.slice(-8).replace(/\D/g, "");
  const suffix = accessKeySuffix ? `-${accessKeySuffix}` : "";
  return `${document.documentKind}-oficial-${date}${suffix}.${format}`;
}

async function recordDownloadAudit(
  context: ServiceContext,
  document: FiscalDocument,
  format: FiscalArtifactFormat,
  outcome: "failed" | "succeeded",
) {
  await context.audit.record({
    action: "fiscal.document.artifact_download",
    actor: context.actor,
    category: "data_access",
    entityId: document.id,
    entityType: "fiscal_document",
    metadata: { format, status: document.status },
    outcome,
    requestId: context.requestId,
    storeId: document.storeId,
    tenantId: document.tenantId,
    summary: `Requested official fiscal ${format.toUpperCase()} artifact`,
  });
}
