import { leads, leadVehicleInterests } from "@lojaveiculosv2/db";
import { eq, inArray, isNull, isNotNull, sql, type SQL } from "drizzle-orm";
import type { CrmLeadOperationalFilters } from "../../../domains/crm/ports/crmRepository.js";

export function leadSelectionConditions(
  input: CrmLeadOperationalFilters,
): SQL[] {
  const conditions: SQL[] = [];
  if (input.assignee === "assigned")
    conditions.push(isNotNull(leads.assignedUserId));
  else if (input.assignee === "unassigned")
    conditions.push(isNull(leads.assignedUserId));
  else if (input.assignee)
    conditions.push(eq(leads.assignedUserId, input.assignee));
  if (input.sources) conditions.push(inArray(leads.source, [...input.sources]));
  if (input.listingId) {
    const interestScope = sql`${leadVehicleInterests.leadId} = ${leads.id}
      and ${leadVehicleInterests.storeId} = ${leads.storeId}
      and ${leadVehicleInterests.tenantId} = ${leads.tenantId}
      and ${leadVehicleInterests.listingId} = ${input.listingId}`;
    conditions.push(
      sql`exists (select 1 from ${leadVehicleInterests} where ${interestScope})`,
    );
  }
  return conditions;
}
