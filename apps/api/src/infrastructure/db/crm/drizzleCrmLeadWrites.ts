import { and, eq, sql } from "drizzle-orm";
import { leads } from "@lojaveiculosv2/db";
import type {
  CreateIdempotentCrmLeadInput,
  CreateIdempotentCrmLeadResult,
} from "../../../domains/crm/ports/crmRepository.js";
import { toLead } from "./drizzleCrmMappers.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function createIdempotentCrmLead(
  db: DrizzleCrmClient,
  input: CreateIdempotentCrmLeadInput,
): Promise<CreateIdempotentCrmLeadResult> {
  const [inserted] = await db
    .insert(leads)
    .values({
      assignedUserId: input.assignedUserId ?? null,
      buyerEmail: input.buyerEmail ?? null,
      buyerName: input.buyerName ?? null,
      buyerPhone: input.buyerPhone ?? null,
      metadata: input.metadata ?? {},
      source: input.source,
      sourceIdentityKey: input.sourceIdentityKey,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [
        leads.tenantId,
        leads.storeId,
        leads.source,
        leads.sourceIdentityKey,
      ],
      where: sql`${leads.sourceIdentityKey} IS NOT NULL AND ${leads.isDeleted} = false`,
    })
    .returning();
  if (inserted) {
    return { created: true, lead: toLead(inserted, emptyVehicleReference) };
  }

  const [existing] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, input.tenantId),
        eq(leads.storeId, input.storeId),
        eq(leads.source, input.source),
        eq(leads.sourceIdentityKey, input.sourceIdentityKey),
        eq(leads.isDeleted, false),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Idempotent CRM lead row was not found.");
  return { created: false, lead: toLead(existing, emptyVehicleReference) };
}

const emptyVehicleReference = { listingId: null, vehicleTitle: null };
