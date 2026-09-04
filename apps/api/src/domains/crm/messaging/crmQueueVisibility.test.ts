import { describe, expect, it } from "vitest";
import type { UserId } from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { CrmQueueVisibility } from "../ports/crmConversationRepository.js";
import type { CrmRealtimeEvent } from "../ports/crmRealtimePublisher.js";
import {
  matchesCrmQueueVisibility,
  resolveCrmConnectionScopedQueueVisibility,
  resolveCrmQueueVisibility,
} from "./crmQueueVisibility.js";
import { matchesCrmRealtimeQueueVisibility } from "./crmQueueVisibilityRealtime.js";

function context(input: {
  actor: { id: string; kind: "system" | "user" };
  permissions: string[];
}) {
  return createServiceContext({
    actor: input.actor,
    permissions: input.permissions,
    request: { requestId: "queue_visibility_test" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

describe("resolveCrmQueueVisibility", () => {
  it("denies queue rows to a non-user actor without assign permission", () => {
    expect(
      resolveCrmQueueVisibility(
        context({
          actor: { id: "queue_worker", kind: "system" },
          permissions: ["crm.conversations.read"],
        }),
      ),
    ).toEqual({ connectionIds: null, kind: "none" });
  });

  it("limits a user without global queue permission to assigned conversations", () => {
    expect(
      resolveCrmQueueVisibility(
        context({
          actor: { id: "user_1", kind: "user" },
          permissions: ["crm.conversations.read"],
        }),
      ),
    ).toEqual({ connectionIds: null, kind: "assigned", userId: "user_1" });
  });

  it("grants global visibility without assignment authority", () => {
    expect(
      resolveCrmQueueVisibility(
        context({
          actor: { id: "user_1", kind: "user" },
          permissions: [
            "crm.conversations.read",
            "crm.conversations.read_unassigned",
          ],
        }),
      ),
    ).toEqual({ connectionIds: null, kind: "global" });
  });

  it("keeps global visibility explicit for an authorized system actor", () => {
    expect(
      resolveCrmQueueVisibility(
        context({
          actor: { id: "queue_worker", kind: "system" },
          permissions: ["crm.conversations.read", "crm.conversations.assign"],
        }),
      ),
    ).toEqual({ connectionIds: null, kind: "global" });
  });
});

describe("resolveCrmConnectionScopedQueueVisibility", () => {
  it("keeps global visibility unrestricted by connection membership", async () => {
    const visibility = await resolveCrmConnectionScopedQueueVisibility(
      context({
        actor: { id: "user_1", kind: "user" },
        permissions: ["crm.conversations.read_unassigned"],
      }),
      {},
    );
    expect(visibility).toEqual({ connectionIds: null, kind: "global" });
  });

  it("restricts assigned visibility to the user's member connections", async () => {
    const visibility = await resolveCrmConnectionScopedQueueVisibility(
      context({
        actor: { id: "user_1", kind: "user" },
        permissions: ["crm.conversations.read"],
      }),
      {
        crmConnectionMemberRepository: {
          grantMember: async () => undefined,
          listConnectionIdsForUser: async () => ["conn_1", "conn_2"],
          listMembers: async () => [],
          listMemberUserIdsByConnectionIds: async () => ({}),
          revokeMember: async () => ({ revoked: true }),
        },
      },
    );
    expect(visibility).toEqual({
      connectionIds: ["conn_1", "conn_2"],
      kind: "assigned",
      userId: "user_1",
    });
  });

  it("resolves an empty membership to a visibility that matches nothing", async () => {
    const actorContext = context({
      actor: { id: "user_1", kind: "user" },
      permissions: ["crm.conversations.read"],
    });
    const visibility = await resolveCrmConnectionScopedQueueVisibility(
      actorContext,
      {
        crmConnectionMemberRepository: {
          grantMember: async () => undefined,
          listConnectionIdsForUser: async () => [],
          listMembers: async () => [],
          listMemberUserIdsByConnectionIds: async () => ({}),
          revokeMember: async () => ({ revoked: false }),
        },
      },
    );
    expect(visibility.kind).toBe("assigned");
    expect(visibility.connectionIds).toEqual([]);
    expect(matchesCrmQueueVisibility(visibility, "user_1", "conn_1")).toBe(
      false,
    );
  });
});

describe("matchesCrmQueueVisibility with connection scope", () => {
  const assigned: CrmQueueVisibility = {
    connectionIds: ["conn_1"],
    kind: "assigned",
    userId: "user_1" as UserId,
  };

  it("keeps unrestricted visibility matching regardless of connection", () => {
    const global: CrmQueueVisibility = { connectionIds: null, kind: "global" };
    expect(matchesCrmQueueVisibility(global, null, "conn_9")).toBe(true);
    expect(matchesCrmQueueVisibility({ kind: "global" }, null)).toBe(true);
  });

  it("matches assigned rows on a member connection", () => {
    expect(matchesCrmQueueVisibility(assigned, "user_1", "conn_1")).toBe(true);
  });

  it("rejects rows on a non-member connection even when assigned", () => {
    expect(matchesCrmQueueVisibility(assigned, "user_1", "conn_2")).toBe(false);
  });

  it("rejects scoped visibility when no connection is provided", () => {
    expect(matchesCrmQueueVisibility(assigned, "user_1")).toBe(false);
  });
});

describe("matchesCrmRealtimeQueueVisibility with connection scope", () => {
  const assigned: CrmQueueVisibility = {
    connectionIds: ["conn_1"],
    kind: "assigned",
    userId: "user_1" as UserId,
  };

  function messageEvent(connectionId: string, assignedUserId: string | null) {
    return {
      connectionId,
      conversationCycle: { assignedUserId },
      storeId: "store_1",
      tenantId: "tenant_1",
      type: "message",
    } as unknown as CrmRealtimeEvent;
  }

  it("matches realtime events on member connections", () => {
    expect(
      matchesCrmRealtimeQueueVisibility(
        assigned,
        messageEvent("conn_1", "user_1"),
      ),
    ).toBe(true);
  });

  it("drops realtime events on non-member connections", () => {
    expect(
      matchesCrmRealtimeQueueVisibility(
        assigned,
        messageEvent("conn_2", "user_1"),
      ),
    ).toBe(false);
  });

  it("scopes connection status events to member connections", () => {
    const statusEvent = (connectionId: string) =>
      ({
        connectionId,
        phone: null,
        status: "connected",
        storeId: "store_1",
        tenantId: "tenant_1",
        type: "connection_status",
      }) as unknown as CrmRealtimeEvent;
    expect(
      matchesCrmRealtimeQueueVisibility(assigned, statusEvent("conn_1")),
    ).toBe(true);
    expect(
      matchesCrmRealtimeQueueVisibility(assigned, statusEvent("conn_2")),
    ).toBe(false);
    expect(
      matchesCrmRealtimeQueueVisibility(
        { connectionIds: null, kind: "global" },
        statusEvent("conn_2"),
      ),
    ).toBe(true);
  });
});
