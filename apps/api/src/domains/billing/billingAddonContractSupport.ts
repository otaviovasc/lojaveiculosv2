import type { StoreId } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../shared/serviceContext.js";
import { BillingAddonContractError } from "./ports/billingRepository.js";
import type { BillingServicePorts } from "./services/BillingService/serviceSupport.js";
import {
  requireBillingScope,
  requireTenantBillingScope,
} from "./services/BillingService/serviceSupport.js";

export function requireAddonContractRepository(ports: BillingServicePorts) {
  const repository = ports.billingRepository;
  if (
    !repository.requestZapiAddon ||
    !repository.markZapiAddonScheduled ||
    !repository.cancelZapiAddon ||
    !repository.confirmZapiAddonCancellationSync ||
    !repository.completeZapiAddonSetup
  ) {
    throw new BillingAddonContractError(
      "Z-API billing contract repository is not configured.",
    );
  }
  return {
    cancelZapiAddon: repository.cancelZapiAddon,
    confirmZapiAddonCancellationSync:
      repository.confirmZapiAddonCancellationSync,
    completeZapiAddonSetup: repository.completeZapiAddonSetup,
    markZapiAddonScheduled: repository.markZapiAddonScheduled,
    requestZapiAddon: repository.requestZapiAddon,
  };
}

export async function resolveAddonContractStoreScope(
  context: ServiceContext,
  input: { storeId?: StoreId },
  ports: BillingServicePorts,
) {
  if (context.storeId) {
    const scope = requireBillingScope(context);
    if (input.storeId && input.storeId !== scope.storeId) {
      throw new BillingAddonContractError("Store scope does not match.");
    }
    return scope;
  }
  const { tenantId } = requireTenantBillingScope(context);
  if (context.billingManagedBy !== "agency" || !input.storeId) {
    throw new BillingAddonContractError("Agency store scope is required.");
  }
  const exists = await ports.billingRepository.storeExistsInTenant({
    storeId: input.storeId,
    tenantId,
  });
  if (!exists) {
    throw new BillingAddonContractError("Managed store was not found.");
  }
  return { storeId: input.storeId, tenantId };
}
