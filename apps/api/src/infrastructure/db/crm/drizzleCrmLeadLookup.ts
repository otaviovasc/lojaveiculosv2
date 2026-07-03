import { and, desc, eq, or, sql, type SQL } from "drizzle-orm";
import { leads } from "@lojaveiculosv2/db";
import { whatsappPhoneLookupCandidates } from "../../../domains/crm/whatsapp/whatsappPhone.js";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toLead } from "./drizzleCrmMappers.js";
import { findLeadVehicleReference } from "./drizzleCrmVehicleReferences.js";

type FindLeadByPhoneInput = Parameters<CrmRepository["findLeadByPhone"]>[0];

export async function findLeadByPhoneInDatabase(
  db: DrizzleCrmClient,
  input: FindLeadByPhoneInput,
) {
  const [row] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.storeId, input.storeId),
        eq(leads.tenantId, input.tenantId),
        eq(leads.isDeleted, false),
        or(...phonePredicates(input.buyerPhone)),
      ),
    )
    .orderBy(desc(leads.updatedAt))
    .limit(1);

  if (!row) return null;
  return toLead(
    row,
    await findLeadVehicleReference(db, {
      leadId: row.id,
      storeId: input.storeId,
      tenantId: input.tenantId,
    }),
  );
}

function phonePredicates(value: string): [SQL, ...SQL[]] {
  const digitsSql = sql`regexp_replace(coalesce(${leads.buyerPhone}, ''), '[^0-9]', '', 'g')`;
  const predicates = [eq(leads.buyerPhone, value) as SQL];
  for (const candidate of whatsappPhoneLookupCandidates(value)) {
    predicates.push(sql`${digitsSql} = ${candidate}`);
  }
  return predicates as [SQL, ...SQL[]];
}
