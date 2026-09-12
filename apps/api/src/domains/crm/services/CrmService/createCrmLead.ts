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
import { CrmPipelineStageNotFoundError } from "../../crmServiceDomainErrors.js";
import { getCrmPipelineRepository } from "./serviceSupport.js";
import { isValidIsoCalendarBirthDate } from "../../messaging/crmSpecialDateCalculator.js";

const permission = "lead.create";

export type CreateCrmLeadInput = {
  assignedUserId?: string | null;
  birthDate?: string | null;
  buyerEmail?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  listingId?: string | null;
  metadata?: Record<string, unknown>;
  pipelineStageId?: string;
  source: LeadSource;
};

export async function createCrmLead(
  context: ServiceContext,
  input: CreateCrmLeadInput,
  ports: CrmServicePorts,
): Promise<CrmLead> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);

  if (
    input.birthDate !== undefined &&
    input.birthDate !== null &&
    !isValidIsoCalendarBirthDate(input.birthDate)
  ) {
    throw new Error(
      "Invalid birthDate: must be a valid calendar date (YYYY-MM-DD) not in the future",
    );
  }

  context.logger.info(
    "crm.lead.create.started",
    createServiceLogMetadata(context, {
      hasListing: Boolean(input.listingId),
      source: input.source,
    }),
  );

  const result = await runCrmTransaction(ports, async (transactionPorts) => {
    const repository = getCrmRepository(transactionPorts);
    const existing = input.buyerPhone
      ? await repository.findLeadByPhone({
          buyerPhone: input.buyerPhone,
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        })
      : null;
    if (existing) {
      // Reuse never relocates an existing lead: stage placement is a
      // create-time intent, and moving stages requires the pipeline-move
      // flow (permission, activity record, lead_move audit).
      const needsPlacement = !existing.pipelineId || !existing.pipelineStageId;
      const placement = needsPlacement
        ? await ensureLeadPipeline(transactionPorts, {
            storeId: scope.storeId as never,
            tenantId: scope.tenantId as never,
          })
        : null;
      const reused = await repository.updateLead({
        ...(!existing.assignedUserId && input.assignedUserId
          ? { assignedUserId: input.assignedUserId as UserId }
          : {}),
        ...(!existing.birthDate && input.birthDate
          ? { birthDate: input.birthDate }
          : {}),
        ...(!existing.buyerEmail && input.buyerEmail
          ? { buyerEmail: input.buyerEmail }
          : {}),
        ...(!existing.buyerName && input.buyerName
          ? { buyerName: input.buyerName }
          : {}),
        leadId: existing.id,
        ...(placement
          ? {
              pipelineId: placement.pipelineId,
              pipelineStageId: placement.pipelineStageId,
              status: placement.leadStatus,
            }
          : {}),
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      return { created: false, lead: reused };
    }
    const placement = input.pipelineStageId
      ? await resolveRequestedStagePlacement(transactionPorts, scope, {
          pipelineStageId: input.pipelineStageId,
        })
      : await ensureLeadPipeline(transactionPorts, {
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        });
    const created = await repository.createLead({
      ...(input.assignedUserId
        ? { assignedUserId: input.assignedUserId as UserId }
        : {}),
      birthDate: input.birthDate ?? null,
      buyerEmail: input.buyerEmail ?? null,
      buyerName: input.buyerName ?? null,
      buyerPhone: input.buyerPhone ?? null,
      listingId: input.listingId ?? null,
      metadata: input.metadata ?? {},
      pipelineId: placement.pipelineId,
      pipelineStageId: placement.pipelineStageId,
      source: input.source,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (input.pipelineStageId && created.status !== placement.leadStatus) {
      return {
        created: true,
        lead: await repository.updateLead({
          leadId: created.id,
          status: placement.leadStatus,
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        }),
      };
    }
    return { created: true, lead: created };
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

async function resolveRequestedStagePlacement(
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
  input: { pipelineStageId: string },
) {
  const stage = await getCrmPipelineRepository(ports).findStageById({
    stageId: input.pipelineStageId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!stage) throw new CrmPipelineStageNotFoundError(input.pipelineStageId);
  return {
    leadStatus: stage.leadStatus,
    pipelineId: stage.pipelineId,
    pipelineStageId: stage.id,
  };
}
