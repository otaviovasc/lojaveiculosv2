import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmLeadActivity,
  LeadActivityDirection,
  LeadActivityType,
} from "../../ports/crmRepository.js";
import {
  CrmActivityIdempotencyConflictError,
  CrmLeadNotFoundError,
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "lead.update";

export type CreateLeadActivityInput = {
  activityType: LeadActivityType;
  content: string;
  direction?: LeadActivityDirection;
  idempotencyFingerprint?: string;
  idempotencyKey?: string;
  leadId: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
  priority?: number;
};

export async function createLeadActivity(
  context: ServiceContext,
  input: CreateLeadActivityInput,
  ports: CrmServicePorts,
): Promise<CrmLeadActivity> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);
  const repository = getCrmRepository(ports);
  const lead = await repository.findLeadById({
    leadId: input.leadId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  if (!lead) throw new CrmLeadNotFoundError(input.leadId);

  context.logger.info(
    "crm.lead.activity.create.started",
    createServiceLogMetadata(context, {
      activityType: input.activityType,
      direction: input.direction ?? "internal",
      leadId: input.leadId,
    }),
  );

  const createInput = {
    activityType: input.activityType,
    content: input.content,
    createdByUserId:
      context.actor.kind === "user" ? (context.actor.id as never) : null,
    direction: input.direction ?? "internal",
    leadId: input.leadId,
    metadata: input.metadata ?? {},
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
    priority: input.priority ?? 0,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
  const hasIdempotency = Boolean(
    input.idempotencyFingerprint && input.idempotencyKey,
  );
  if (Boolean(input.idempotencyFingerprint) !== Boolean(input.idempotencyKey)) {
    throw new Error(
      "CRM activity idempotency requires both key and fingerprint.",
    );
  }
  const result = hasIdempotency
    ? await repository.createActivityIdempotently({
        ...createInput,
        idempotencyFingerprint: input.idempotencyFingerprint!,
        idempotencyKey: input.idempotencyKey!,
      })
    : {
        activity: await repository.createActivity(createInput),
        created: true,
      };
  const activity = result.activity;
  if (
    hasIdempotency &&
    (activity.idempotencyFingerprint !== input.idempotencyFingerprint ||
      activity.leadId !== input.leadId ||
      activity.storeId !== scope.storeId ||
      activity.tenantId !== scope.tenantId)
  ) {
    throw new CrmActivityIdempotencyConflictError();
  }

  await context.audit.record({
    action: "crm.lead.activity.create",
    actor: context.actor,
    category: "data_change",
    entityId: activity.id,
    entityType: "lead_activity",
    metadata: {
      activityType: activity.activityType,
      direction: activity.direction,
      idempotencyReused: !result.created,
      leadId: activity.leadId,
      permission,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: result.created
      ? "Created CRM lead activity"
      : "Reused idempotent CRM lead activity",
  });

  return activity;
}
