import { createConnectionRepositoryMethods } from "./financingConnectionRepositoryMethods.js";
import { createInquiryRepositoryMethods } from "./financingInquiryRepositoryMethods.js";
import {
  createMemoryFinancingRepositoryState,
  type MemoryFinancingRepository,
  type MemoryFinancingRepositoryOptions,
} from "./financingRepositoryState.js";
import {
  seedConnection,
  seedStoreMapping,
} from "./financingRepositorySupport.js";

export type { MemoryFinancingRepositoryOptions };

export function createMemoryFinancingRepository(
  options: MemoryFinancingRepositoryOptions = {},
): MemoryFinancingRepository {
  const state = createMemoryFinancingRepositoryState(options);

  return {
    ...createConnectionRepositoryMethods(state),
    ...createInquiryRepositoryMethods(state),
    inspect: () => ({
      connections: state.connections,
      inquiries: state.inquiries,
      oauthTransactions: state.oauthTransactions,
      operations: state.operations,
      storeMappings: state.storeMappings,
    }),
    seedConnection: (input) => seedConnection(state, input),
    seedStoreMapping: (input) => seedStoreMapping(state, input),
  };
}
