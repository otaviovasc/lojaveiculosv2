import type { DocumentRepository } from "../../../documents/ports/documentRepository.js";
import type { FinanceRepository } from "../../ports/financeRepository.js";
import type { FinanceAutoEntryRepository } from "../../ports/financeAutoEntryRepository.js";
import type { CommissionWorkspaceRepository } from "../../ports/commissionWorkspaceRepository.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";

export type FinanceServicePorts = {
  commissionWorkspaceRepository?: CommissionWorkspaceRepository;
  documentRepository: DocumentRepository;
  financeAutoEntryRepository: FinanceAutoEntryRepository;
  financeRepository: FinanceRepository;
  objectStorage?: ObjectStorage;
};
