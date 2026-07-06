import type { UserId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead, LeadSource } from "../../ports/crmRepository.js";
import {
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "lead.create";

export type CreateCrmLeadInput = {
  assignedUserId?: string | null;
  buyerEmail?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  listingId?: string | null;
  metadata?: Record<string, unknown>;
  source: LeadSource;
};

export async function createCrmLead(
  context: ServiceContext,
  input: CreateCrmLeadInput,
  ports: CrmServicePorts,
): Promise<CrmLead> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);

  context.logger.info(
    "crm.lead.create.started",
    createServiceLogMetadata(context, {
      hasListing: Boolean(input.listingId),
      source: input.source,
    }),
  );

  const lead = await getCrmRepository(ports).createLead({
    ...(input.assignedUserId
      ? { assignedUserId: input.assignedUserId as UserId }
      : {}),
    buyerEmail: input.buyerEmail ?? null,
    buyerName: input.buyerName ?? null,
    buyerPhone: input.buyerPhone ?? null,
    listingId: input.listingId ?? null,
    metadata: input.metadata ?? {},
    source: input.source,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "crm.lead.create",
    actor: context.actor,
    category: "data_change",
    entityId: lead.id,
    entityType: "lead",
    metadata: {
      hasBuyerEmail: Boolean(lead.buyerEmail),
      hasBuyerPhone: Boolean(lead.buyerPhone),
      listingId: lead.listingId,
      permission,
      source: lead.source,
      status: lead.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Created CRM lead",
  });

  return lead;
}
