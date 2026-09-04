import { conversationThreads } from "@lojaveiculosv2/db";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import type { CanonicalInboundMessageInput } from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  canonicalThreadCandidates,
  scopedCanonicalInboundThread,
} from "./drizzleCrmCanonicalInboundSupport.js";

export async function resolveCanonicalInboundThread(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
  contactId: string,
) {
  const candidates = canonicalThreadCandidates(input);
  const existingRows = await db
    .select()
    .from(conversationThreads)
    .where(
      and(
        eq(conversationThreads.providerConnectionId, input.connectionId),
        or(
          inArray(
            conversationThreads.externalThreadId,
            candidates.externalThreadIds,
          ),
          inArray(conversationThreads.customerPhone, candidates.phones),
          inArray(conversationThreads.customerChatId, candidates.chatIds),
        ),
        eq(conversationThreads.storeId, input.storeId),
        eq(conversationThreads.tenantId, input.tenantId),
      ),
    )
    .orderBy(asc(conversationThreads.createdAt))
    .limit(2);
  if (existingRows.length > 1) {
    throw new Error("Canonical CRM thread identity is ambiguous.");
  }
  const [existing] = existingRows;
  if (existing) {
    if (existing.contactId && existing.contactId !== contactId) {
      throw new Error(
        "Canonical CRM thread identity conflicts with the resolved contact.",
      );
    }
    if (!existing.contactId) {
      await db
        .update(conversationThreads)
        .set({ contactId, updatedAt: new Date() })
        .where(
          and(
            scopedCanonicalInboundThread(input, existing.id),
            isNull(conversationThreads.contactId),
          ),
        );
      return { ...existing, contactId };
    }
    return existing;
  }
  const [created] = await db
    .insert(conversationThreads)
    .values({
      channel: input.channel,
      contactId,
      customerChatId: input.customerChatId,
      customerDisplayName: input.contactDisplayName,
      customerPhone:
        input.identity.kind === "phone"
          ? input.identity.normalizedValue
          : input.secondaryPhone,
      externalThreadId: input.externalThreadId,
      metadata: { unreadCount: 0 },
      providerConnectionId: input.connectionId,
      profilePhotoUrl: input.profilePhotoUrl,
      source: input.source,
      state: "open",
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .returning();
  if (!created) throw new Error("Canonical CRM thread was not persisted.");
  return created;
}
