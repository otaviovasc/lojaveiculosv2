import { describe, expect, it } from "vitest";
import type { StoreId } from "@lojaveiculosv2/shared";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnectionMemberRepository } from "../../ports/crmConnectionMemberRepository.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { grantConnectionMember } from "./grantConnectionMember.js";
import { listConnectionMembers } from "./listConnectionMembers.js";
import { revokeConnectionMember } from "./revokeConnectionMember.js";
import type { CrmConnectionMemberServicePorts } from "./connectionMemberSupport.js";

const scope = { storeId: "store-1", tenantId: "tenant-1" };

function whatsappConnection(overrides: Partial<CrmConnection> = {}) {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "WhatsApp",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    ...scope,
    webhookUrl: null,
    ...overrides,
  } as CrmConnection;
}

function memberRepository(): CrmConnectionMemberRepository & {
  members: Map<string, { createdAt: Date; grantedBy: string | null }>;
} {
  const members = new Map<
    string,
    { createdAt: Date; grantedBy: string | null }
  >();
  return {
    members,
    grantMember: async (input) => {
      if (!members.has(input.userId)) {
        members.set(input.userId, {
          createdAt: new Date("2026-08-12T00:00:00.000Z"),
          grantedBy: input.grantedBy,
        });
      }
    },
    listConnectionIdsForUser: async () => [],
    listMembers: async () =>
      [...members.entries()].map(([userId, member]) => ({
        createdAt: member.createdAt,
        grantedBy: member.grantedBy,
        userId: userId as never,
      })),
    listMemberUserIdsByConnectionIds: async () => ({}),
    revokeMember: async (input) => ({ revoked: members.delete(input.userId) }),
  };
}

function setup(input: {
  activeStoreMember?: boolean;
  assignedCount?: number;
  connection?: CrmConnection | null;
}) {
  const audit = createMemoryAuditSink();
  const context = createServiceContext({
    actor: { id: "manager-1", kind: "user" },
    audit,
    entitlements: ["crm"],
    permissions: ["crm.messaging.connection.setup"],
    request: { requestId: "request-1" },
    ...scope,
  });
  const members = memberRepository();
  const ports: CrmConnectionMemberServicePorts = {
    crmAssigneeMembershipRepository: {
      isActiveStoreMember: async () => input.activeStoreMember ?? true,
    },
    crmConnectionMemberRepository: members,
    crmConnectionRepository: {
      findConnectionById: async () =>
        input.connection === undefined
          ? whatsappConnection()
          : input.connection,
    } as never,
    crmConversationRepository: {
      countConversationCycles: async () => input.assignedCount ?? 0,
    } as never,
  };
  return { audit, context, members, ports };
}

describe("grantConnectionMember", () => {
  it("grants an active store member and audits the grant", async () => {
    const { audit, context, members, ports } = setup({});
    await grantConnectionMember(
      context,
      { connectionId: "connection-1", userId: "user-1" },
      ports,
    );
    expect(members.members.get("user-1")?.grantedBy).toBe("manager-1");
    expect(
      audit.events.filter(
        (event) => event.action === "crm.connection.member.grant",
      ),
    ).toHaveLength(2);
  });

  it("rejects a user that is not an active store member", async () => {
    const { context, members, ports } = setup({ activeStoreMember: false });
    await expect(
      grantConnectionMember(
        context,
        { connectionId: "connection-1", userId: "user-1" },
        ports,
      ),
    ).rejects.toMatchObject({
      code: "user_not_store_member",
      name: "CrmConnectionMemberValidationError",
    });
    expect(members.members.size).toBe(0);
  });

  it("rejects connections outside the store scope", async () => {
    const { context, ports } = setup({
      connection: whatsappConnection({ storeId: "store-2" as StoreId }),
    });
    await expect(
      grantConnectionMember(
        context,
        { connectionId: "connection-1", userId: "user-1" },
        ports,
      ),
    ).rejects.toMatchObject({ code: "connection_not_found" });
  });

  it("rejects non-whatsapp connections", async () => {
    const { context, ports } = setup({
      connection: whatsappConnection({ channel: "instagram" }),
    });
    await expect(
      grantConnectionMember(
        context,
        { connectionId: "connection-1", userId: "user-1" },
        ports,
      ),
    ).rejects.toMatchObject({ code: "connection_not_whatsapp" });
  });
});

describe("revokeConnectionMember", () => {
  it("revokes membership and reports assignments left intact", async () => {
    const { audit, context, members, ports } = setup({ assignedCount: 2 });
    await grantConnectionMember(
      context,
      { connectionId: "connection-1", userId: "user-1" },
      ports,
    );
    // A second member keeps the connection visible after the revocation.
    await grantConnectionMember(
      context,
      { connectionId: "connection-1", userId: "user-2" },
      ports,
    );
    const result = await revokeConnectionMember(
      context,
      { connectionId: "connection-1", userId: "user-1" },
      ports,
    );
    expect(result).toEqual({
      activeAssignedConversationCount: 2,
      revoked: true,
    });
    expect(members.members.has("user-1")).toBe(false);
    expect(members.members.has("user-2")).toBe(true);
    const revokeEvents = audit.events.filter(
      (event) => event.action === "crm.connection.member.revoke",
    );
    expect(revokeEvents).toHaveLength(2);
    expect(revokeEvents[1]?.metadata).toMatchObject({
      activeAssignedConversationCount: 2,
      assignmentsLeftIntact: true,
      revoked: true,
    });
  });

  it("refuses to revoke the last remaining member", async () => {
    const { context, members, ports } = setup({});
    await grantConnectionMember(
      context,
      { connectionId: "connection-1", userId: "user-1" },
      ports,
    );
    await expect(
      revokeConnectionMember(
        context,
        { connectionId: "connection-1", userId: "user-1" },
        ports,
      ),
    ).rejects.toMatchObject({
      code: "connection_last_member",
      name: "CrmConnectionMemberValidationError",
    });
    expect(members.members.has("user-1")).toBe(true);
  });

  it("reports revoked: false when the user is not a member", async () => {
    const { context, ports } = setup({});
    const result = await revokeConnectionMember(
      context,
      { connectionId: "connection-1", userId: "user-9" },
      ports,
    );
    expect(result.revoked).toBe(false);
  });
});

describe("listConnectionMembers", () => {
  it("lists granted members", async () => {
    const { context, ports } = setup({});
    await grantConnectionMember(
      context,
      { connectionId: "connection-1", userId: "user-1" },
      ports,
    );
    const members = await listConnectionMembers(
      context,
      { connectionId: "connection-1" },
      ports,
    );
    expect(members).toEqual([
      {
        createdAt: new Date("2026-08-12T00:00:00.000Z"),
        grantedBy: "manager-1",
        userId: "user-1",
      },
    ]);
  });
});
