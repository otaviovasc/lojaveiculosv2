import type { DocumentRepository } from "../../../documents/ports/documentRepository.js";
import type { FinanceRepository } from "../../ports/financeRepository.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";

export type FinanceServicePorts = {
  documentRepository: DocumentRepository;
  financeRepository: FinanceRepository;
  objectStorage?: ObjectStorage;
};
