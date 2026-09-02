import type {
  CrmConnectionMember,
  CrmConnectionMemberRepository,
} from "../../../../domains/crm/ports/crmConnectionMemberRepository.js";

export function createMemoryCrmConnectionMemberRepository(): CrmConnectionMemberRepository {
  const members: (CrmConnectionMember & {
    connectionId: string;
    storeId: string;
    tenantId: string;
  })[] = [];

  const matches = (
    member: (typeof members)[number],
    scope: { storeId: string; tenantId: string },
  ) => member.storeId === scope.storeId && member.tenantId === scope.tenantId;

  return {
    async grantMember(input) {
      const existing = members.find(
        (member) =>
          matches(member, input) &&
          member.connectionId === input.connectionId &&
          member.userId === input.userId,
      );
      if (existing) return;
      members.push({
        connectionId: input.connectionId,
        createdAt: new Date(),
        grantedBy: input.grantedBy,
        storeId: input.storeId,
        tenantId: input.tenantId,
        userId: input.userId,
      });
    },
    async listConnectionIdsForUser(input) {
      return members
        .filter(
          (member) => matches(member, input) && member.userId === input.userId,
        )
        .map((member) => member.connectionId);
    },
    async listMemberUserIdsByConnectionIds(input) {
      const result: Record<string, readonly string[]> = {};
      for (const member of members) {
        if (!matches(member, input)) continue;
        if (!input.connectionIds.includes(member.connectionId)) continue;
        const existing = result[member.connectionId];
        result[member.connectionId] = existing
          ? [...existing, member.userId]
          : [member.userId];
      }
      return result;
    },
    async listMembers(input) {
      return members
        .filter(
          (member) =>
            matches(member, input) &&
            member.connectionId === input.connectionId,
        )
        .map(({ createdAt, grantedBy, userId }) => ({
          createdAt,
          grantedBy,
          userId,
        }));
    },
    async revokeMember(input) {
      const index = members.findIndex(
        (member) =>
          matches(member, input) &&
          member.connectionId === input.connectionId &&
          member.userId === input.userId,
      );
      if (index < 0) return { revoked: false };
      members.splice(index, 1);
      return { revoked: true };
    },
  };
}
