import { vi } from "vitest";
import type { CrmConnectionMemberRepository } from "./ports/crmConnectionMemberRepository.js";

export type RecordedMemberGrant = {
  connectionId: string;
  grantedBy: string | null;
  storeId: string;
  tenantId: string;
  userId: string;
};

export function createTestCrmConnectionMemberRepository(): {
  grants: RecordedMemberGrant[];
  repository: CrmConnectionMemberRepository;
} {
  type GrantInput = Parameters<CrmConnectionMemberRepository["grantMember"]>[0];
  const grants: RecordedMemberGrant[] = [];
  const repository: CrmConnectionMemberRepository = {
    grantMember: vi.fn(async (input: GrantInput) => {
      if (
        grants.some(
          (grant) =>
            grant.connectionId === input.connectionId &&
            grant.userId === input.userId,
        )
      ) {
        return;
      }
      grants.push({
        connectionId: input.connectionId,
        grantedBy: input.grantedBy,
        storeId: input.storeId,
        tenantId: input.tenantId,
        userId: input.userId,
      });
    }),
    listConnectionIdsForUser: async ({ userId }) =>
      grants
        .filter((grant) => grant.userId === userId)
        .map((grant) => grant.connectionId),
    listMemberUserIdsByConnectionIds: async ({ connectionIds }) =>
      Object.fromEntries(
        connectionIds.map((connectionId) => [
          connectionId,
          grants
            .filter((grant) => grant.connectionId === connectionId)
            .map((grant) => grant.userId),
        ]),
      ),
    listMembers: async ({ connectionId }) =>
      grants
        .filter((grant) => grant.connectionId === connectionId)
        .map((grant) => ({
          createdAt: new Date(),
          grantedBy: grant.grantedBy,
          userId: grant.userId as never,
        })),
    revokeMember: async () => ({ revoked: false }),
  };
  return { grants, repository };
}
