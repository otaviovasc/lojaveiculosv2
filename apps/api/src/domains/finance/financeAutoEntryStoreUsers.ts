import type { FinanceAutoEntryRecipient } from "@lojaveiculosv2/shared";
import type {
  FinanceAutoEntryRepository,
  FinanceAutoEntryRule,
} from "./ports/financeAutoEntryRepository.js";
import { FinanceAutoEntryEvaluationError } from "./services/FinanceService/financeAutoEntryEvaluator.js";
import { FinanceAutoEntryRuleValidationError } from "./services/FinanceService/financeAutoEntryRuleValidation.js";

type FinanceScope = { storeId: string; tenantId: string };

export async function assertRuleUsersBelongToStore(
  repository: FinanceAutoEntryRepository,
  input: {
    recipient: FinanceAutoEntryRecipient;
    sellerUserId: string | null;
  },
  scope: FinanceScope,
): Promise<void> {
  const invalidUserId = await findInactiveStoreUser(
    repository,
    collectRuleUserIds(input),
    scope,
  );
  if (invalidUserId) {
    throw new FinanceAutoEntryRuleValidationError(
      `User ${invalidUserId} must have an active membership in the current store.`,
    );
  }
}

export async function assertMaterializationUsersBelongToStore(
  repository: FinanceAutoEntryRepository,
  input: {
    rules?: readonly FinanceAutoEntryRule[];
    sellerUserId: string | null;
  },
  scope: FinanceScope,
): Promise<void> {
  const userIds = new Set<string>();
  if (input.sellerUserId) userIds.add(input.sellerUserId);
  for (const rule of input.rules ?? []) {
    if (rule.recipient.kind === "fixed_user") {
      userIds.add(rule.recipient.userId);
    }
  }
  const invalidUserId = await findInactiveStoreUser(
    repository,
    [...userIds],
    scope,
  );
  if (invalidUserId) {
    throw new FinanceAutoEntryEvaluationError(
      `User ${invalidUserId} must have an active membership in the current store.`,
    );
  }
}

function collectRuleUserIds(input: {
  recipient: FinanceAutoEntryRecipient;
  sellerUserId: string | null;
}): string[] {
  const userIds = new Set<string>();
  if (input.sellerUserId) userIds.add(input.sellerUserId);
  if (input.recipient.kind === "fixed_user") {
    userIds.add(input.recipient.userId);
  }
  return [...userIds];
}

async function findInactiveStoreUser(
  repository: FinanceAutoEntryRepository,
  userIds: readonly string[],
  scope: FinanceScope,
): Promise<string | null> {
  for (const userId of userIds) {
    const isActive = await repository.isActiveStoreMember({
      ...scope,
      userId,
    });
    if (!isActive) return userId;
  }
  return null;
}
