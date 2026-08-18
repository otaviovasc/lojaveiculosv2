import * as schema from "@lojaveiculosv2/db";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

type Scope = { storeId: string; tenantId: string };

export async function seedCanonicalContext(
  db: DrizzleCrmClient,
  input: {
    chatLid?: string;
    connectionId: string;
    cycleId: string;
    externalThreadId: string;
    phone?: string;
    scope: Scope;
    threadId: string;
  },
) {
  await db.insert(schema.conversationThreads).values({
    channel: "whatsapp",
    customerChatId: input.chatLid ?? null,
    customerPhone: input.phone ?? null,
    externalThreadId: input.externalThreadId,
    id: input.threadId,
    providerConnectionId: input.connectionId,
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
  });
  await db.insert(schema.conversationCycles).values({
    id: input.cycleId,
    threadId: input.threadId,
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
  });
  await db.insert(schema.conversationAttendances).values({
    cycleId: input.cycleId,
    threadId: input.threadId,
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
  });
}
