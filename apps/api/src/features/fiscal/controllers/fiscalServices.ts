import type { ServiceContext } from "../../../shared/serviceContext.js";
import { cancelFiscalDocument } from "../../../domains/fiscal/services/FiscalService/cancelFiscalDocument.js";
import type { CancelFiscalDocumentInput } from "../../../domains/fiscal/services/FiscalService/cancelFiscalDocument.js";
import { getFiscalOverview } from "../../../domains/fiscal/services/FiscalService/getFiscalOverview.js";
import { issueFiscalDocument } from "../../../domains/fiscal/services/FiscalService/issueFiscalDocument.js";
import type { IssueFiscalDocumentInput } from "../../../domains/fiscal/services/FiscalService/issueFiscalDocument.js";
import { syncFiscalDocumentStatus } from "../../../domains/fiscal/services/FiscalService/syncFiscalDocumentStatus.js";
import type { SyncFiscalDocumentStatusInput } from "../../../domains/fiscal/services/FiscalService/syncFiscalDocumentStatus.js";
import type {
  FiscalDocument,
  FiscalOverview,
} from "../../../domains/fiscal/ports/fiscalRepository.js";
import type { FiscalServicePorts } from "../../../domains/fiscal/services/FiscalService/serviceSupport.js";
import { createMemoryFiscalProviderGateway } from "../adapters/memory/fiscalProviderGateway.js";
import { createMemoryFiscalRepository } from "../adapters/memory/fiscalRepository.js";

export type FiscalServices = {
  cancelDocument: (
    context: ServiceContext,
    input: CancelFiscalDocumentInput,
  ) => Promise<FiscalDocument>;
  getOverview: (context: ServiceContext) => Promise<FiscalOverview>;
  issueDocument: (
    context: ServiceContext,
    input: IssueFiscalDocumentInput,
  ) => Promise<FiscalDocument>;
  syncDocumentStatus: (
    context: ServiceContext,
    input: SyncFiscalDocumentStatusInput,
  ) => Promise<FiscalDocument>;
};

export function createFiscalServices(
  ports: FiscalServicePorts = {
    fiscalProviderGateway: createMemoryFiscalProviderGateway(),
    fiscalRepository: createMemoryFiscalRepository(),
  },
): FiscalServices {
  return {
    cancelDocument: (context, input) =>
      cancelFiscalDocument(context, input, ports),
    getOverview: (context) => getFiscalOverview(context, ports),
    issueDocument: (context, input) =>
      issueFiscalDocument(context, input, ports),
    syncDocumentStatus: (context, input) =>
      syncFiscalDocumentStatus(context, input, ports),
  };
}

export const fiscalServices = createFiscalServices();
