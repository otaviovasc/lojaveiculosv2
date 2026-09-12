import type { CrmAssigneeMembershipRepository } from "../../../../domains/crm/ports/crmAssigneeMembershipRepository.js";

export function createMemoryCrmAssigneeMembershipRepository(): CrmAssigneeMembershipRepository {
  return { isActiveStoreMember: async () => true };
}
