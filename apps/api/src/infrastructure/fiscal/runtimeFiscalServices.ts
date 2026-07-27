import {
  createFiscalServices,
  type FiscalServices,
} from "../../features/fiscal/controllers/fiscalServices.js";
import { createMemoryFiscalProviderGateway } from "../../features/fiscal/adapters/memory/fiscalProviderGateway.js";
import { createMemoryFiscalProviderAdminGateway } from "../../features/fiscal/adapters/memory/fiscalProviderAdminGateway.js";
import {
  createDrizzleFiscalRepository,
  type DrizzleFiscalClient,
} from "../db/fiscal/drizzleFiscalRepository.js";
import { createDrizzleFiscalConnectionRepository } from "../db/fiscal/drizzleFiscalConnectionRepository.js";
import { createDrizzleFiscalWebhookRepository } from "../db/fiscal/drizzleFiscalWebhookRepository.js";
import { createFiscalCredentialCodec } from "./fiscalCredentialCodec.js";
import { createSpedyHttpFiscalAdminGateway } from "./spedyHttpFiscalAdminGateway.js";
import { createSpedyHttpFiscalProviderGateway } from "./spedyHttpFiscalProviderGateway.js";

export function createRuntimeFiscalServices(
  db: unknown,
  env: Record<string, string | undefined>,
): FiscalServices {
  const useHttpGateway = env.SPEDY_RUNTIME_IMPLEMENTATION === "http";
  const fiscalConnectionRepository = createDrizzleFiscalConnectionRepository(
    db as DrizzleFiscalClient,
    createFiscalCredentialCodec(env),
  );

  return createFiscalServices({
    fiscalConnectionRepository,
    fiscalProviderAdminGateway: useHttpGateway
      ? createSpedyHttpFiscalAdminGateway({ env })
      : createMemoryFiscalProviderAdminGateway(),
    fiscalProviderGateway: useHttpGateway
      ? createSpedyHttpFiscalProviderGateway({
          connectionRepository: fiscalConnectionRepository,
          env,
        })
      : createMemoryFiscalProviderGateway(false),
    fiscalRepository: createDrizzleFiscalRepository(db as DrizzleFiscalClient),
    fiscalWebhookRepository: createDrizzleFiscalWebhookRepository(
      db as DrizzleFiscalClient,
      env.APP_ENV ?? env.NODE_ENV ?? "unknown",
    ),
  });
}
