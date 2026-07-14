import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { roleTemplates, storeMemberships, users } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type { ActiveStoreMember } from "../../../domains/identity/ports/roleManagementRepository.js";

type DrizzleStoreMemberOptionsClient = PostgresJsDatabase<typeof schema>;

export async function listActiveStoreMembers(
  db: DrizzleStoreMemberOptionsClient,
  input: { storeId: string; tenantId: string },
): Promise<readonly ActiveStoreMember[]> {
  const members = await db
    .select({
      email: users.email,
      name: users.name,
      role: roleTemplates.roleKey,
      userId: users.id,
    })
    .from(storeMemberships)
    .innerJoin(users, eq(users.id, storeMemberships.userId))
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, storeMemberships.roleTemplateId),
    )
    .where(
      and(
        eq(storeMemberships.storeId, input.storeId),
        eq(storeMemberships.tenantId, input.tenantId),
        eq(storeMemberships.status, "active"),
      ),
    )
    .limit(200);

  return members.map((member) => ({
    ...member,
    userId: member.userId as never,
  }));
}
