import { createZapiCrmWhatsappGateway } from "../crm/zapiCrmWhatsappGateway.js";
import {
  createCrmServices,
  type CrmServices,
} from "../../features/crm/controllers/crmServices.js";
import type { CrmRealtimePublisher } from "../../domains/crm/ports/crmRealtimePublisher.js";
import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import type { DrizzleCrmClient } from "./crm/drizzleCrmRepository.js";

export function createRuntimeCrmServices(
  db: unknown,
  env: Record<string, string | undefined>,
  realtimePublisher?: CrmRealtimePublisher,
  objectStorage?: ObjectStorage | null,
): CrmServices {
  return createCrmServices({
    drizzleClient: db as DrizzleCrmClient,
    environment: env.APP_ENV ?? env.NODE_ENV ?? "local",
    ports: {
      ...(realtimePublisher ? { crmRealtimePublisher: realtimePublisher } : {}),
      ...(objectStorage ? { crmWhatsappMediaStorage: objectStorage } : {}),
      crmWhatsappGateway: createZapiCrmWhatsappGateway(env),
    },
  });
}
