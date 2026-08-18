import { randomUUID } from "node:crypto";
import type {
  CanonicalInboundMessageInput,
  CanonicalInboundMessageResult,
  CrmCanonicalInboundRepository,
} from "../../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { CrmWhatsappRepository } from "../../../../domains/crm/ports/crmWhatsappRepository.js";
import {
  ingestProjectedCanonicalInbound,
  scopedCanonicalIdentityKey,
} from "./crmCanonicalInboundProjection.js";

type MemoryThread = {
  contactId: string;
  externalThreadIds: Set<string>;
  id: string;
  input: CanonicalInboundMessageInput;
};

export type MemoryCrmCanonicalInboundSnapshot = {
  attendances: readonly {
    cycleId: string;
    state: "bot_active";
    storeId: string;
    tenantId: string;
    threadId: string;
  }[];
  cycles: readonly {
    id: string;
    state: "active";
    storeId: string;
    tenantId: string;
    threadId: string;
  }[];
  messages: readonly (CanonicalInboundMessageInput & {
    cycleId: string;
    id: string;
    threadId: string;
  })[];
  threads: readonly {
    contactId: string;
    externalThreadIds: readonly string[];
    id: string;
    storeId: string;
    tenantId: string;
  }[];
};

export type MemoryCrmCanonicalInboundRepository =
  CrmCanonicalInboundRepository & {
    snapshot(): MemoryCrmCanonicalInboundSnapshot;
  };

export function createMemoryCrmCanonicalInboundRepository(
  whatsappRepository?: CrmWhatsappRepository,
): MemoryCrmCanonicalInboundRepository {
  const attendances: MemoryCrmCanonicalInboundSnapshot["attendances"][number][] =
    [];
  const cycles: MemoryCrmCanonicalInboundSnapshot["cycles"][number][] = [];
  const identities = new Map<
    string,
    { contactId: string; identityId: string }
  >();
  const messages: MemoryCrmCanonicalInboundSnapshot["messages"][number][] = [];
  const threads: MemoryThread[] = [];

  return {
    async ingestInboundMessage(input) {
      if (whatsappRepository) {
        return ingestProjectedCanonicalInbound(
          whatsappRepository,
          identities,
          input,
        );
      }
      const duplicate = messages.find(
        (message) =>
          message.tenantId === input.tenantId &&
          message.storeId === input.storeId &&
          message.connectionId === input.connectionId &&
          message.providerMessageId === input.providerMessageId,
      );
      if (duplicate)
        return resultFor(duplicate, identities, attendances, false, false);

      const identityKey = scopedCanonicalIdentityKey(input);
      const identity = identities.get(identityKey) ?? {
        contactId: randomUUID(),
        identityId: randomUUID(),
      };
      identities.set(identityKey, identity);
      const externalIds = new Set([
        input.externalThreadId,
        ...input.externalThreadAliases,
      ]);
      let thread = threads.find(
        (candidate) =>
          candidate.input.tenantId === input.tenantId &&
          candidate.input.storeId === input.storeId &&
          candidate.input.connectionId === input.connectionId &&
          [...externalIds].some((id) => candidate.externalThreadIds.has(id)),
      );
      if (!thread) {
        thread = {
          contactId: identity.contactId,
          externalThreadIds: externalIds,
          id: randomUUID(),
          input,
        };
        threads.push(thread);
      } else {
        for (const id of externalIds) thread.externalThreadIds.add(id);
      }
      let cycle = cycles.find(
        (candidate) =>
          candidate.threadId === thread.id &&
          candidate.tenantId === input.tenantId &&
          candidate.storeId === input.storeId &&
          candidate.state === "active",
      );
      const createdSession = !cycle;
      if (!cycle) {
        cycle = {
          id: randomUUID(),
          state: "active",
          storeId: input.storeId,
          tenantId: input.tenantId,
          threadId: thread.id,
        };
        cycles.push(cycle);
        attendances.push({
          cycleId: cycle.id,
          state: "bot_active",
          storeId: input.storeId,
          tenantId: input.tenantId,
          threadId: thread.id,
        });
      }
      const message = {
        ...input,
        cycleId: cycle.id,
        id: randomUUID(),
        threadId: thread.id,
      };
      messages.push(message);
      return resultFor(message, identities, attendances, true, createdSession);
    },
    snapshot: () => ({
      attendances: attendances.map((item) => ({ ...item })),
      cycles: cycles.map((item) => ({ ...item })),
      messages: messages.map((item) => ({ ...item })),
      threads: threads.map((thread) => ({
        contactId: thread.contactId,
        externalThreadIds: [...thread.externalThreadIds],
        id: thread.id,
        storeId: thread.input.storeId,
        tenantId: thread.input.tenantId,
      })),
    }),
  };
}

function resultFor(
  message: MemoryCrmCanonicalInboundSnapshot["messages"][number],
  identities: Map<string, { contactId: string; identityId: string }>,
  attendances: MemoryCrmCanonicalInboundSnapshot["attendances"],
  created: boolean,
  createdSession: boolean,
): CanonicalInboundMessageResult {
  const identity = identities.get(scopedCanonicalIdentityKey(message));
  if (!identity) throw new Error("Canonical CRM memory identity is missing.");
  const attendance = attendances.find(
    (item) => item.cycleId === message.cycleId,
  );
  if (!attendance)
    throw new Error("Canonical CRM memory attendance is missing.");
  return {
    attendanceState: attendance.state,
    contactId: identity.contactId,
    created,
    createdSession,
    cycleId: message.cycleId,
    identityId: identity.identityId,
    messageId: message.id,
    threadId: message.threadId,
  };
}
