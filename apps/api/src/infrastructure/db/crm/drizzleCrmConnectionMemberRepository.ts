import { crmChannelConnectionMembers } from "@lojaveiculosv2/db";
import { and, eq, inArray } from "drizzle-orm";
import type {
  CrmConnectionMember,
  CrmConnectionMemberRepository,
} from "../../../domains/crm/ports/crmConnectionMemberRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmConnectionMemberRepository(
  db: DrizzleCrmClient,
): CrmConnectionMemberRepository {
  return {
    async grantMember(input) {
      await db
        .insert(crmChannelConnectionMembers)
        .values({
          connectionId: input.connectionId,
          grantedBy: input.grantedBy,
          storeId: input.storeId,
          tenantId: input.tenantId,
          userId: input.userId,
        })
        .onConflictDoNothing({
          target: [
            crmChannelConnectionMembers.connectionId,
            crmChannelConnectionMembers.userId,
          ],
        });
    },
    async listConnectionIdsForUser(input) {
      const rows = await db
        .select({ connectionId: crmChannelConnectionMembers.connectionId })
        .from(crmChannelConnectionMembers)
        .where(
          and(
            eq(crmChannelConnectionMembers.tenantId, input.tenantId),
            eq(crmChannelConnectionMembers.storeId, input.storeId),
            eq(crmChannelConnectionMembers.userId, input.userId),
          ),
        );
      return rows.map((row) => row.connectionId);
    },
    async listMembers(input) {
      const rows = await db
        .select({
          createdAt: crmChannelConnectionMembers.createdAt,
          grantedBy: crmChannelConnectionMembers.grantedBy,
          userId: crmChannelConnectionMembers.userId,
        })
        .from(crmChannelConnectionMembers)
        .where(
          and(
            eq(crmChannelConnectionMembers.tenantId, input.tenantId),
            eq(crmChannelConnectionMembers.storeId, input.storeId),
            eq(crmChannelConnectionMembers.connectionId, input.connectionId),
          ),
        );
      return rows.map((row): CrmConnectionMember => ({
        createdAt: row.createdAt,
        grantedBy: row.grantedBy,
        userId: row.userId as CrmConnectionMember["userId"],
      }));
    },
    async listMemberUserIdsByConnectionIds(input) {
      const result: Record<string, readonly string[]> = {};
      if (input.connectionIds.length === 0) return result;
      const rows = await db
        .select({
          connectionId: crmChannelConnectionMembers.connectionId,
          userId: crmChannelConnectionMembers.userId,
        })
        .from(crmChannelConnectionMembers)
        .where(
          and(
            eq(crmChannelConnectionMembers.tenantId, input.tenantId),
            eq(crmChannelConnectionMembers.storeId, input.storeId),
            inArray(crmChannelConnectionMembers.connectionId, [
              ...input.connectionIds,
            ]),
          ),
        );
      for (const row of rows) {
        const existing = result[row.connectionId];
        result[row.connectionId] = existing
          ? [...existing, row.userId]
          : [row.userId];
      }
      return result;
    },
    async revokeMember(input) {
      const rows = await db
        .delete(crmChannelConnectionMembers)
        .where(
          and(
            eq(crmChannelConnectionMembers.tenantId, input.tenantId),
            eq(crmChannelConnectionMembers.storeId, input.storeId),
            eq(crmChannelConnectionMembers.connectionId, input.connectionId),
            eq(crmChannelConnectionMembers.userId, input.userId),
          ),
        )
        .returning({ id: crmChannelConnectionMembers.id });
      return { revoked: rows.length > 0 };
    },
  };
}
