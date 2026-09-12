import type { EntitlementKey } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";

export type ResolveCrmBotEntitlementsInput = {
  context: ServiceContext;
  integrationId: string | null;
  storeId: string;
  tenantId: string;
};

export type ResolveCrmBotEntitlements = (
  input: ResolveCrmBotEntitlementsInput,
) => Promise<readonly EntitlementKey[]>;
