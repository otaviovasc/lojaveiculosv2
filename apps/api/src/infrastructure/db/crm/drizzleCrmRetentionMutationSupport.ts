import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type {
  CrmRetentionAuditIntent,
  CrmRetentionCutoffs,
} from "../../../domains/crm/ports/crmRetentionRepository.js";
import type { DrizzleCrmRetentionCandidate } from "./drizzleCrmRetentionCandidates.js";

export type DrizzleCrmRetentionMutationInput = Readonly<{
  auditIntent: CrmRetentionAuditIntent;
  candidates: readonly DrizzleCrmRetentionCandidate[];
  cutoffs: CrmRetentionCutoffs;
  legalHoldSkipped: number;
  now: Date;
  storeId: string;
  tenantId: string;
}>;

export function retentionCandidateIds(
  input: DrizzleCrmRetentionMutationInput,
  resourceType: DrizzleCrmRetentionCandidate["resourceType"],
): string[] {
  return input.candidates
    .filter((candidate) => candidate.resourceType === resourceType)
    .map((candidate) => candidate.resourceId);
}

export function withoutActiveRetentionHold(
  category: string,
  resourceType: string,
  resourceId: AnyPgColumn,
  input: Pick<DrizzleCrmRetentionMutationInput, "now" | "storeId" | "tenantId">,
  equivalentResourceType?: string,
) {
  return sql`not exists (
    select 1 from crm_retention_legal_holds hold
    where hold.tenant_id = ${input.tenantId}::uuid
      and hold.store_id = ${input.storeId}::uuid
      and hold.released_at is null
      and hold.starts_at <= ${input.now}
      and (hold.expires_at is null or hold.expires_at > ${input.now})
      and (hold.category is null or hold.category = ${category})
      and (hold.resource_type is null or hold.resource_type = ${resourceType}
        or (${equivalentResourceType ?? null}::text is not null
          and hold.resource_type = ${equivalentResourceType ?? null}))
      and (hold.resource_id is null or hold.resource_id = ${resourceId})
  )`;
}
