import type {
  CrmRetentionCategory,
  CrmRetentionRepository,
  ProcessCrmRetentionBatchInput,
} from "../ports/crmRetentionRepository.js";

export type MemoryCrmRetentionItem = {
  anonymized?: boolean;
  category: CrmRetentionCategory;
  cycleClosed?: boolean;
  eligibleAt: Date;
  id: string;
  purged?: boolean;
  storeId: string;
  tenantId: string;
};

export type MemoryCrmLegalHold = {
  category?: CrmRetentionCategory;
  expiresAt?: Date;
  released?: boolean;
  resourceId?: string;
  startsAt: Date;
  storeId: string;
  tenantId: string;
};

export function createMemoryCrmRetentionRepository(
  input: {
    holds?: readonly MemoryCrmLegalHold[];
    items?: readonly MemoryCrmRetentionItem[];
    unavailableRelations?: readonly string[];
  } = {},
): CrmRetentionRepository & {
  items: MemoryCrmRetentionItem[];
} {
  const items = (input.items ?? []).map((item) => ({ ...item }));
  const holds = [...(input.holds ?? [])];
  const cursors = new Map<string, string>();
  return {
    items,
    async claimAuditOutbox() {
      return [];
    },
    async claimScopes(claim) {
      const scopes = new Map<string, { storeId: string; tenantId: string }>();
      for (const item of items) {
        if (claim.tenantId && claim.tenantId !== item.tenantId) continue;
        if (claim.storeId && claim.storeId !== item.storeId) continue;
        scopes.set(`${item.tenantId}:${item.storeId}`, {
          storeId: item.storeId,
          tenantId: item.tenantId,
        });
      }
      return [...scopes.entries()].slice(0, claim.limit).map(([key, scope]) => {
        const cursor = cursors.get(key);
        return { ...scope, ...(cursor ? { cursor } : {}) };
      });
    },
    async completeScope(completion) {
      const key = `${completion.tenantId}:${completion.storeId}`;
      if (completion.cursor) cursors.set(key, completion.cursor);
      else cursors.delete(key);
      return true;
    },
    async inspectReadiness() {
      return {
        unavailableRelations: [...(input.unavailableRelations ?? [])],
      };
    },
    async markAuditOutbox() {
      return true;
    },
    async processBatch(batch) {
      const candidates = items
        .filter((item) => isEligible(item, batch))
        .sort(compareItems);
      const cursor = readCursor(batch.cursor);
      const remaining = cursor
        ? candidates.filter((item) => compareItems(item, cursor) > 0)
        : candidates;
      const page = remaining.slice(0, batch.limit);
      const held = page.filter((item) => hasLegalHold(item, holds, batch.now));
      const actionable = page.filter((item) => !held.includes(item));

      if (!batch.dryRun) {
        for (const item of actionable) {
          if (item.category === "canonical_message") item.anonymized = true;
          else item.purged = true;
        }
      }

      const categories = (
        [
          ["canonical_message", "anonymize"],
          ["provider_raw_payload", "purge"],
          ["bot_interaction", "purge"],
        ] as const
      ).map(([category, action]) => {
        const eligible = actionable.filter(
          (item) => item.category === category,
        ).length;
        return {
          action,
          affected: batch.dryRun ? 0 : eligible,
          category,
          eligible,
        };
      });
      return {
        categories,
        legalHoldSkipped: held.length,
        nextCursor:
          page.length < remaining.length
            ? writeCursor(page[page.length - 1]!)
            : null,
        verified:
          batch.dryRun ||
          actionable.every((item) =>
            item.category === "canonical_message"
              ? item.anonymized === true
              : item.purged === true,
          ),
      };
    },
  };
}

function compareItems(
  left: Pick<MemoryCrmRetentionItem, "category" | "eligibleAt" | "id">,
  right: Pick<MemoryCrmRetentionItem, "category" | "eligibleAt" | "id">,
): number {
  return (
    left.eligibleAt.getTime() - right.eligibleAt.getTime() ||
    left.category.localeCompare(right.category) ||
    left.id.localeCompare(right.id)
  );
}

function cutoffFor(
  item: MemoryCrmRetentionItem,
  input: ProcessCrmRetentionBatchInput,
): Date {
  if (item.category === "canonical_message") {
    return input.cutoffs.canonicalMessageBefore;
  }
  if (item.category === "provider_raw_payload") {
    return input.cutoffs.providerRawPayloadBefore;
  }
  return input.cutoffs.botInteractionBefore;
}

function isEligible(
  item: MemoryCrmRetentionItem,
  input: ProcessCrmRetentionBatchInput,
): boolean {
  if (
    item.tenantId !== input.scope.tenantId ||
    item.storeId !== input.scope.storeId
  ) {
    return false;
  }
  if (item.anonymized || item.purged) return false;
  if (item.category === "canonical_message" && item.cycleClosed !== true) {
    return false;
  }
  return item.eligibleAt.getTime() <= cutoffFor(item, input).getTime();
}

function hasLegalHold(
  item: MemoryCrmRetentionItem,
  holds: readonly MemoryCrmLegalHold[],
  now: Date,
): boolean {
  return holds.some(
    (hold) =>
      hold.tenantId === item.tenantId &&
      hold.storeId === item.storeId &&
      hold.released !== true &&
      hold.startsAt.getTime() <= now.getTime() &&
      (!hold.expiresAt || hold.expiresAt.getTime() > now.getTime()) &&
      (!hold.category || hold.category === item.category) &&
      (!hold.resourceId || hold.resourceId === item.id),
  );
}

function readCursor(
  cursor: string | undefined,
): Pick<MemoryCrmRetentionItem, "category" | "eligibleAt" | "id"> | null {
  if (!cursor) return null;
  try {
    const value = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as { category: CrmRetentionCategory; eligibleAt: string; id: string };
    return { ...value, eligibleAt: new Date(value.eligibleAt) };
  } catch {
    return null;
  }
}

function writeCursor(item: MemoryCrmRetentionItem): string {
  return Buffer.from(
    JSON.stringify({
      category: item.category,
      eligibleAt: item.eligibleAt.toISOString(),
      id: item.id,
    }),
    "utf8",
  ).toString("base64url");
}
