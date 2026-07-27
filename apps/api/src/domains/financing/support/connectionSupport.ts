import type {
  FinancingProvider,
  FinancingProviderStore,
  FinancingTokenSet,
} from "../ports/financingRepository.js";
import type { FinancingStore } from "../ports/financingProviderGateway.js";
import { normalizeDocument } from "../services/FinancingService/serviceSupport.js";

export const credereFinancingProvider = "credere" satisfies FinancingProvider;

export function redactFinancingConnection<
  T extends { token: FinancingTokenSet | null },
>(connection: T): Omit<T, "token"> & { token: null } {
  return { ...connection, token: null };
}

export function toProviderStores(
  stores: readonly FinancingStore[],
): FinancingProviderStore[] {
  return stores.map((store) => ({
    documentLast4: store.cnpj ? normalizeDocument(store.cnpj).slice(-4) : null,
    id: store.id,
    name: store.displayName ?? store.name ?? store.id,
    status: "active" as const,
  }));
}
