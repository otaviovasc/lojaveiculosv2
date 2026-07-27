import type { SafeAuditMetadata } from "@lojaveiculosv2/audit";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { FiscalDocument } from "../../ports/fiscalRepository.js";
import { readNfeVehiclePayload } from "../../documents/nfeVehiclePayload.js";
import {
  createIssueMetadata,
  createProviderMetadata,
  createProviderPayload,
  inferDocumentKind,
  mapProviderStatus,
} from "../../documents/fiscalIssuePayload.js";
import {
  assertTemplatePreviewResolved,
  previewFiscalTemplate,
} from "./manageFiscalTemplates.js";
import {
  FiscalProviderNotReadyError,
  isFailureStatus,
  type IssueFiscalDocumentInput,
  readTemplateIfPresent,
} from "../../fiscalIssuanceSupport.js";
import {
  requireFiscalScope,
  type FiscalServicePorts,
} from "./serviceSupport.js";

export {
  FiscalProviderNotReadyError,
  type IssueFiscalDocumentInput,
} from "../../fiscalIssuanceSupport.js";

export async function issueFiscalDocument(
  context: ServiceContext,
  input: IssueFiscalDocumentInput,
  ports: FiscalServicePorts,
): Promise<FiscalDocument> {
  assertPermission(context, "fiscal.manage");
  assertPermission(context, "fiscal.document.issue");
  const scope = requireFiscalScope(context);
  const documentKind =
    input.documentKind ?? inferDocumentKind(input.documentType);
  const providerStatus = await ports.fiscalProviderGateway.getProviderStatus({
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!providerStatus.configured) {
    throw new FiscalProviderNotReadyError(providerStatus.missingConfiguration);
  }
  const template = await readTemplateIfPresent(context, input, ports);
  const preview = template
    ? await previewFiscalTemplate(
        context,
        { templateId: template.id, variables: input.templateVariables ?? {} },
        ports,
      )
    : null;
  if (preview) assertTemplatePreviewResolved(preview);
  const nfeVehiclePayload =
    documentKind === "nfe" ? readNfeVehiclePayload(input.metadata) : null;
  const recipientId = input.recipientId ?? template?.recipientId ?? null;
  const recipient = recipientId
    ? await ports.fiscalRepository.getRecipient({
        id: recipientId,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      })
    : null;
  context.logger.info(
    "fiscal.document.issue.started",
    createServiceLogMetadata(context, {
      documentType: input.documentType,
      externalReference: input.externalReference,
    }),
  );

  await auditIssue(
    context,
    scope,
    "fiscal.document.issue_attempt",
    "succeeded",
    {
      documentKind,
      documentType: input.documentType,
      templateId: template?.id ?? null,
    },
  );

  const document = await ports.fiscalRepository.createDocument({
    documentKind,
    documentType: input.documentType,
    metadata: createIssueMetadata(
      input,
      template,
      preview?.renderedDescription,
      nfeVehiclePayload,
    ),
    recipientId,
    status: "queued",
    storeId: scope.storeId,
    templateId: template?.id ?? input.templateId ?? null,
    templateVersion: template?.version ?? null,
    tenantId: scope.tenantId,
  });

  await ports.fiscalRepository.createDocumentSnapshot({
    actorId: context.actor.id,
    fiscalDocumentId: document.id,
    providerPayload: createProviderPayload(
      input,
      documentKind,
      template,
      nfeVehiclePayload,
    ),
    renderedDescription: preview?.renderedDescription ?? null,
    storeId: scope.storeId,
    snapshotType: "issue_requested",
    tenantId: scope.tenantId,
  });

  try {
    const providerResult = await ports.fiscalProviderGateway.issueDocument({
      documentKind,
      documentType: input.documentType,
      externalReference: input.externalReference,
      integrationId: document.id,
      metadata: {
        ...createProviderMetadata(input, nfeVehiclePayload),
        ...(recipient
          ? {
              recipient: {
                address: recipient.address,
                documentNumber: recipient.documentNumber,
                email: recipient.email,
                legalName: recipient.legalName,
                phone: recipient.phone,
              },
            }
          : {}),
        ...(template
          ? {
              renderedDescription: preview?.renderedDescription ?? null,
              template: {
                cityServiceCode: template.cityServiceCode,
                defaultServiceLocation: template.defaultServiceLocation,
                defaultTaxationType: template.defaultTaxationType,
                retentionConfig: template.retentionConfig,
                serviceMunicipalCode: template.serviceMunicipalCode,
                serviceNationalCode: template.serviceNationalCode,
              },
            }
          : {}),
      },
      recipientId,
      storeId: scope.storeId,
      templateId: template?.id ?? input.templateId ?? null,
      templateVersion: template?.version ?? null,
      tenantId: scope.tenantId,
    });
    const updated = await ports.fiscalRepository.updateDocumentStatus({
      accessKey: providerResult.accessKey,
      documentId: document.id,
      metadata: { providerStatus: providerResult.status },
      providerDocumentId: providerResult.providerDocumentId,
      status: mapProviderStatus(providerResult.status),
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    });
    await ports.fiscalRepository.createDocumentSnapshot({
      actorId: context.actor.id,
      fiscalDocumentId: document.id,
      providerResponse: providerResult.rawResponse ?? {},
      renderedDescription: preview?.renderedDescription ?? null,
      snapshotType: "issue_response",
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    });
    await auditIssue(
      context,
      scope,
      "fiscal.document.issue",
      isFailureStatus(updated.status) ? "failed" : "succeeded",
      {
        documentId: updated.id,
        providerDocumentId: updated.providerDocumentId,
        status: updated.status,
      },
    );
    return updated;
  } catch (error) {
    await ports.fiscalRepository.updateDocumentStatus({
      documentId: document.id,
      metadata: {
        providerErrorName: error instanceof Error ? error.name : "UnknownError",
      },
      status: "error",
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    });
    await ports.fiscalRepository.createDocumentSnapshot({
      actorId: context.actor.id,
      fiscalDocumentId: document.id,
      providerResponse: {
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
      renderedDescription: preview?.renderedDescription ?? null,
      snapshotType: "issue_error",
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    });
    await auditIssue(context, scope, "fiscal.document.issue", "failed", {
      documentId: document.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw error;
  }
}

async function auditIssue(
  context: ServiceContext,
  scope: { storeId: string; tenantId: string },
  action: string,
  outcome: "failed" | "succeeded",
  metadata: SafeAuditMetadata,
) {
  await context.audit.record({
    action,
    actor: context.actor,
    category: "integration",
    criticality: "critical",
    entityId: String(metadata.documentId ?? scope.storeId),
    entityType: "fiscal_document",
    metadata,
    outcome,
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Issued fiscal document through provider",
  });
}
