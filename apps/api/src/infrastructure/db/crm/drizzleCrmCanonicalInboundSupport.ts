export function readCanonicalThreadMetadata(
  value: unknown,
): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function canonicalThreadCandidates(input: CanonicalInboundMessageInput) {
  const values = new Set([
    input.externalThreadId,
    ...input.externalThreadAliases,
  ]);
  const phones = new Set<string>();
  const chatIds = new Set<string>();
  for (const value of values) {
    const unprefixed = value.match(/^(?:lid|phone):(.+)$/u)?.[1] ?? value;
    values.add(unprefixed);
    if (/@lid$/iu.test(unprefixed)) {
      chatIds.add(unprefixed);
      values.add(`lid:${unprefixed}`);
      continue;
    }
    const digits = unprefixed.replace(/\D/gu, "");
    if (!digits || digits.length < 7 || digits.length > 15) continue;
    phones.add(digits);
    phones.add(`+${digits}`);
    values.add(`phone:${digits}`);
    values.add(`phone:+${digits}`);
  }
  if (input.customerChatId) chatIds.add(input.customerChatId);
  if (input.identity.kind === "phone")
    phones.add(input.identity.normalizedValue);
  if (input.secondaryPhone) phones.add(input.secondaryPhone);
  return {
    chatIds: [...chatIds, "__no_chat_identity__"],
    externalThreadIds: [...values],
    phones: [...phones, "__no_phone_identity__"],
  };
}

export function readCanonicalUnreadCount(metadata: Record<string, unknown>) {
  return typeof metadata.unreadCount === "number" ? metadata.unreadCount : 0;
}

export function scopedCanonicalInboundThread(
  input: CanonicalInboundMessageInput,
  threadId: string,
) {
  return and(
    eq(conversationThreads.id, threadId),
    eq(conversationThreads.storeId, input.storeId),
    eq(conversationThreads.tenantId, input.tenantId),
  );
}
import { conversationThreads } from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type { CanonicalInboundMessageInput } from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
