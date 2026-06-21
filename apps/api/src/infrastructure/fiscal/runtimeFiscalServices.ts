import {
  createFiscalServices,
  type FiscalServices,
} from "../../features/fiscal/controllers/fiscalServices.js";
import { createMemoryFiscalProviderGateway } from "../../features/fiscal/adapters/memory/fiscalProviderGateway.js";
import {
  createDrizzleFiscalRepository,
  type DrizzleFiscalClient,
} from "../db/fiscal/drizzleFiscalRepository.js";
import { createSpedyHttpFiscalProviderGateway } from "./spedyHttpFiscalProviderGateway.js";

export function createRuntimeFiscalServices(
  db: unknown,
  env: Record<string, string | undefined>,
): FiscalServices {
  const useHttpGateway = env.SPEDY_RUNTIME_IMPLEMENTATION === "http";

  return createFiscalServices({
    fiscalProviderGateway: useHttpGateway
      ? createSpedyHttpFiscalProviderGateway({ env })
      : createMemoryFiscalProviderGateway(false),
    fiscalRepository: createDrizzleFiscalRepository(db as DrizzleFiscalClient),
  });
}
