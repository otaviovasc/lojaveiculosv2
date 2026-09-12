import type { ServiceContext } from "../../../shared/serviceContext.js";
import { cancelFiscalDocument } from "../../../domains/fiscal/services/FiscalService/cancelFiscalDocument.js";
import type { CancelFiscalDocumentInput } from "../../../domains/fiscal/services/FiscalService/cancelFiscalDocument.js";
import {
  downloadFiscalDocumentArtifact,
  type DownloadFiscalDocumentArtifactInput,
  type FiscalDocumentArtifactDownload,
} from "../../../domains/fiscal/services/FiscalService/downloadFiscalDocumentArtifact.js";
import { getFiscalOverview } from "../../../domains/fiscal/services/FiscalService/getFiscalOverview.js";
import { issueFiscalDocument } from "../../../domains/fiscal/services/FiscalService/issueFiscalDocument.js";
import type { IssueFiscalDocumentInput } from "../../../domains/fiscal/services/FiscalService/issueFiscalDocument.js";
import {
  archiveFiscalRecipient,
  createFiscalRecipient,
  listFiscalRecipients,
  updateFiscalRecipient,
  type UpdateFiscalRecipientCommand,
  type UpsertFiscalRecipientInput,
} from "../../../domains/fiscal/services/FiscalService/manageFiscalRecipients.js";
import {
  archiveFiscalTemplate,
  createFiscalTemplate,
  listFiscalTemplates,
  previewFiscalTemplate,
  updateFiscalTemplate,
  type UpdateFiscalTemplateCommand,
  type UpsertFiscalTemplateInput,
} from "../../../domains/fiscal/services/FiscalService/manageFiscalTemplates.js";
import { syncFiscalDocumentStatus } from "../../../domains/fiscal/services/FiscalService/syncFiscalDocumentStatus.js";
import type { SyncFiscalDocumentStatusInput } from "../../../domains/fiscal/services/FiscalService/syncFiscalDocumentStatus.js";
import { repeatFiscalDocument } from "../../../domains/fiscal/services/FiscalService/repeatFiscalDocument.js";
import type { RepeatFiscalDocumentInput } from "../../../domains/fiscal/services/FiscalService/repeatFiscalDocument.js";
import type {
  FiscalDocument,
  FiscalOverview,
  FiscalServiceInvoiceTemplate,
  FiscalServiceRecipient,
} from "../../../domains/fiscal/ports/fiscalRepository.js";
import type { FiscalServicePorts } from "../../../domains/fiscal/services/FiscalService/serviceSupport.js";
import {
  confirmFiscalDefaults,
  getFiscalConnection,
  setupFiscalConnection,
  syncFiscalConnection,
  uploadFiscalCertificate,
} from "../../../domains/fiscal/services/FiscalService/manageFiscalConnection.js";
import { createMemoryFiscalProviderGateway } from "../adapters/memory/fiscalProviderGateway.js";
import { createMemoryFiscalRepository } from "../adapters/memory/fiscalRepository.js";
import { createMemoryFiscalConnectionRepository } from "../adapters/memory/fiscalConnectionRepository.js";
import { createMemoryFiscalProviderAdminGateway } from "../adapters/memory/fiscalProviderAdminGateway.js";
import type { FiscalIssuerProfileInput } from "../../../domains/fiscal/ports/fiscalProviderAdminGateway.js";
import type { FiscalConnection } from "../../../domains/fiscal/ports/fiscalConnectionRepository.js";
import { processSpedyWebhook } from "../../../domains/fiscal/services/FiscalService/processSpedyWebhook.js";
import { createMemoryFiscalWebhookRepository } from "../adapters/memory/fiscalWebhookRepository.js";

export type FiscalServices = {
  confirmDefaults: (
    context: ServiceContext,
    input: { taxDefaults: Record<string, unknown> },
  ) => Promise<FiscalConnection>;
  archiveRecipient: (
    context: ServiceContext,
    input: { id: string },
  ) => Promise<FiscalServiceRecipient>;
  archiveTemplate: (
    context: ServiceContext,
    input: { id: string },
  ) => Promise<FiscalServiceInvoiceTemplate>;
  cancelDocument: (
    context: ServiceContext,
    input: CancelFiscalDocumentInput,
  ) => Promise<FiscalDocument>;
  createRecipient: (
    context: ServiceContext,
    input: UpsertFiscalRecipientInput,
  ) => Promise<FiscalServiceRecipient>;
  createTemplate: (
    context: ServiceContext,
    input: UpsertFiscalTemplateInput,
  ) => Promise<FiscalServiceInvoiceTemplate>;
  downloadDocumentArtifact: (
    context: ServiceContext,
    input: DownloadFiscalDocumentArtifactInput,
  ) => Promise<FiscalDocumentArtifactDownload>;
  getOverview: (context: ServiceContext) => Promise<FiscalOverview>;
  getConnection: (context: ServiceContext) => Promise<FiscalConnection>;
  issueDocument: (
    context: ServiceContext,
    input: IssueFiscalDocumentInput,
  ) => Promise<FiscalDocument>;
  listRecipients: (
    context: ServiceContext,
  ) => Promise<readonly FiscalServiceRecipient[]>;
  listTemplates: (
    context: ServiceContext,
    input: { recipientId?: string | null | undefined },
  ) => Promise<readonly FiscalServiceInvoiceTemplate[]>;
  previewTemplate: (
    context: ServiceContext,
    input: { templateId: string; variables: Record<string, unknown> },
  ) => Promise<Awaited<ReturnType<typeof previewFiscalTemplate>>>;
  processWebhook: (
    context: ServiceContext,
    input: { payload: Record<string, unknown>; token: string },
  ) => Promise<
    | { documentId: string; status: "processed" }
    | { status: "duplicate" | "ignored" }
  >;
  repeatDocument: (
    context: ServiceContext,
    input: RepeatFiscalDocumentInput,
  ) => Promise<FiscalDocument>;
  syncDocumentStatus: (
    context: ServiceContext,
    input: SyncFiscalDocumentStatusInput,
  ) => Promise<FiscalDocument>;
  setupConnection: (
    context: ServiceContext,
    input: {
      issuerProfile: FiscalIssuerProfileInput;
      taxDefaults?: Record<string, unknown>;
    },
  ) => Promise<FiscalConnection>;
  syncConnection: (context: ServiceContext) => Promise<FiscalConnection>;
  updateRecipient: (
    context: ServiceContext,
    input: UpdateFiscalRecipientCommand,
  ) => Promise<FiscalServiceRecipient>;
  updateTemplate: (
    context: ServiceContext,
    input: UpdateFiscalTemplateCommand,
  ) => Promise<FiscalServiceInvoiceTemplate>;
  uploadCertificate: (
    context: ServiceContext,
    input: { certificate: Blob; password: string },
  ) => Promise<FiscalConnection>;
};

export function createFiscalServices(
  ports: FiscalServicePorts = {
    fiscalConnectionRepository: createMemoryFiscalConnectionRepository(),
    fiscalProviderAdminGateway: createMemoryFiscalProviderAdminGateway(),
    fiscalProviderGateway: createMemoryFiscalProviderGateway(),
    fiscalRepository: createMemoryFiscalRepository(),
    fiscalWebhookRepository: createMemoryFiscalWebhookRepository(),
  },
): FiscalServices {
  return {
    confirmDefaults: (context, input) =>
      confirmFiscalDefaults(context, input, ports),
    archiveRecipient: (context, input) =>
      archiveFiscalRecipient(context, input, ports),
    archiveTemplate: (context, input) =>
      archiveFiscalTemplate(context, input, ports),
    cancelDocument: (context, input) =>
      cancelFiscalDocument(context, input, ports),
    createRecipient: (context, input) =>
      createFiscalRecipient(context, input, ports),
    createTemplate: (context, input) =>
      createFiscalTemplate(context, input, ports),
    downloadDocumentArtifact: (context, input) =>
      downloadFiscalDocumentArtifact(context, input, ports),
    getOverview: (context) => getFiscalOverview(context, ports),
    getConnection: (context) => getFiscalConnection(context, ports),
    issueDocument: (context, input) =>
      issueFiscalDocument(context, input, ports),
    listRecipients: (context) => listFiscalRecipients(context, ports),
    listTemplates: (context, input) =>
      listFiscalTemplates(context, input, ports),
    previewTemplate: (context, input) =>
      previewFiscalTemplate(context, input, ports),
    processWebhook: (context, input) =>
      processSpedyWebhook(context, input, ports),
    repeatDocument: (context, input) =>
      repeatFiscalDocument(context, input, ports),
    syncDocumentStatus: (context, input) =>
      syncFiscalDocumentStatus(context, input, ports),
    setupConnection: (context, input) =>
      setupFiscalConnection(context, input, ports),
    syncConnection: (context) => syncFiscalConnection(context, ports),
    updateRecipient: (context, input) =>
      updateFiscalRecipient(context, input, ports),
    updateTemplate: (context, input) =>
      updateFiscalTemplate(context, input, ports),
    uploadCertificate: (context, input) =>
      uploadFiscalCertificate(context, input, ports),
  };
}

export const fiscalServices = createFiscalServices();
