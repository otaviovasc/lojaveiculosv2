import type { DocumentLinkTarget } from "./documentRepository.js";

export type ValidateDocumentLinkTargetInput = {
  storeId: string;
  targetId: string;
  targetType: DocumentLinkTarget;
  tenantId: string;
};

export type DocumentLinkTargetValidator = {
  existsInScope: (input: ValidateDocumentLinkTargetInput) => Promise<boolean>;
};
