import type { UserId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead, LeadSource } from "../../ports/crmRepository.js";
import {
  getCrmRepository,
  requireCrmScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "./serviceSupport.js";
import { ensureLeadPipeline } from "../../pipeline/ensureLeadPipeline.js";

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

  const result = await runCrmTransaction(ports, async (transactionPorts) => {
    const placement = await ensureLeadPipeline(transactionPorts, {
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    const repository = getCrmRepository(transactionPorts);
    const existing = input.buyerPhone
      ? await repository.findLeadByPhone({
          buyerPhone: input.buyerPhone,
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        })
      : null;
    if (existing) {
      return {
        created: false,
        lead: await repository.updateLead({
          ...(!existing.assignedUserId && input.assignedUserId
            ? { assignedUserId: input.assignedUserId as UserId }
            : {}),
          ...(!existing.buyerEmail && input.buyerEmail
            ? { buyerEmail: input.buyerEmail }
            : {}),
          ...(!existing.buyerName && input.buyerName
            ? { buyerName: input.buyerName }
            : {}),
          leadId: existing.id,
          ...(!existing.pipelineId || !existing.pipelineStageId
            ? placement
            : {}),
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        }),
      };
    }
    return {
      created: true,
      lead: await repository.createLead({
        ...(input.assignedUserId
          ? { assignedUserId: input.assignedUserId as UserId }
          : {}),
        buyerEmail: input.buyerEmail ?? null,
        buyerName: input.buyerName ?? null,
        buyerPhone: input.buyerPhone ?? null,
        listingId: input.listingId ?? null,
        metadata: input.metadata ?? {},
        ...placement,
        source: input.source,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      }),
    };
  });
  const { lead } = result;

  await context.audit.record({
    action: result.created ? "crm.lead.create" : "crm.lead.reuse",
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
      reused: !result.created,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: result.created ? "Created CRM lead" : "Reused active CRM lead",
  });

  return lead;
}
