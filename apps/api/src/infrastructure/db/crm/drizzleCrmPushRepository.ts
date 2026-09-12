import type { CrmPushRepository } from "../../../domains/crm/ports/crmPushRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { createCrmPushDeliveryOperations } from "./drizzleCrmPushDeliveryRepository.js";
import { createCrmPushIntentOperations } from "./drizzleCrmPushIntentRepository.js";
import { listCrmPushRecipientCandidates } from "./drizzleCrmPushRecipients.js";
import { createCrmPushSubscriptionOperations } from "./drizzleCrmPushSubscriptions.js";

export function createDrizzleCrmPushRepository(
  db: DrizzleCrmClient,
): CrmPushRepository {
  return {
    ...createCrmPushDeliveryOperations(db),
    ...createCrmPushIntentOperations(db),
    ...createCrmPushSubscriptionOperations(db),
    listRecipientCandidates: (input) =>
      listCrmPushRecipientCandidates(db, input),
  };
}
