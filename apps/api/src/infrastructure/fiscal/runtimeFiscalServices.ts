import {
  createFiscalServices,
  type FiscalServices,
} from "../../features/fiscal/controllers/fiscalServices.js";
import { createMemoryFiscalProviderGateway } from "../../features/fiscal/adapters/memory/fiscalProviderGateway.js";
import {
  createDrizzleFiscalRepository,
  type DrizzleFiscalClient,
} from "../db/fiscal/drizzleFiscalRepository.js";

export function createRuntimeFiscalServices(
  db: unknown,
  _env: Record<string, string | undefined>,
): FiscalServices {
  return createFiscalServices({
    fiscalProviderGateway: createMemoryFiscalProviderGateway(false),
    fiscalRepository: createDrizzleFiscalRepository(db as DrizzleFiscalClient),
  });
}
