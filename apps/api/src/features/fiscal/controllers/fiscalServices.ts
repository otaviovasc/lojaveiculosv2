import type { ServiceContext } from "../../../shared/serviceContext.js";
import { cancelFiscalDocument } from "../../../domains/fiscal/services/FiscalService/cancelFiscalDocument.js";
import type { CancelFiscalDocumentInput } from "../../../domains/fiscal/services/FiscalService/cancelFiscalDocument.js";
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
import { createMemoryFiscalProviderGateway } from "../adapters/memory/fiscalProviderGateway.js";
import { createMemoryFiscalRepository } from "../adapters/memory/fiscalRepository.js";

export type FiscalServices = {
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
  getOverview: (context: ServiceContext) => Promise<FiscalOverview>;
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
  repeatDocument: (
    context: ServiceContext,
    input: RepeatFiscalDocumentInput,
  ) => Promise<FiscalDocument>;
  syncDocumentStatus: (
    context: ServiceContext,
    input: SyncFiscalDocumentStatusInput,
  ) => Promise<FiscalDocument>;
  updateRecipient: (
    context: ServiceContext,
    input: UpdateFiscalRecipientCommand,
  ) => Promise<FiscalServiceRecipient>;
  updateTemplate: (
    context: ServiceContext,
    input: UpdateFiscalTemplateCommand,
  ) => Promise<FiscalServiceInvoiceTemplate>;
};

export function createFiscalServices(
  ports: FiscalServicePorts = {
    fiscalProviderGateway: createMemoryFiscalProviderGateway(),
    fiscalRepository: createMemoryFiscalRepository(),
  },
): FiscalServices {
  return {
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
    getOverview: (context) => getFiscalOverview(context, ports),
    issueDocument: (context, input) =>
      issueFiscalDocument(context, input, ports),
    listRecipients: (context) => listFiscalRecipients(context, ports),
    listTemplates: (context, input) =>
      listFiscalTemplates(context, input, ports),
    previewTemplate: (context, input) =>
      previewFiscalTemplate(context, input, ports),
    repeatDocument: (context, input) =>
      repeatFiscalDocument(context, input, ports),
    syncDocumentStatus: (context, input) =>
      syncFiscalDocumentStatus(context, input, ports),
    updateRecipient: (context, input) =>
      updateFiscalRecipient(context, input, ports),
    updateTemplate: (context, input) =>
      updateFiscalTemplate(context, input, ports),
  };
}

export const fiscalServices = createFiscalServices();
