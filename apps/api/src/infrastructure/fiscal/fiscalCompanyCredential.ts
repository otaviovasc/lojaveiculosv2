import type { FiscalConnectionRepository } from "../../domains/fiscal/ports/fiscalConnectionRepository.js";
import { FiscalCredentialDecryptionError } from "./fiscalCredentialCodec.js";

export async function readFiscalCompanyCredential(
  repository: FiscalConnectionRepository,
  input: { storeId: string; tenantId: string },
) {
  try {
    return {
      unreadable: false,
      value: await repository.getCompanyApiKey(input),
    };
  } catch (error) {
    if (error instanceof FiscalCredentialDecryptionError) {
      return { unreadable: true, value: null };
    }
    throw error;
  }
}
