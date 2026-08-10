export class CrmLeadNotFoundError extends Error {
  constructor(leadId: string) {
    super(`Lead not found: ${leadId}`);
    this.name = "CrmLeadNotFoundError";
  }
}

export class CrmActivityIdempotencyConflictError extends Error {
  constructor() {
    super(
      "Idempotency key was already used with a different CRM activity payload.",
    );
    this.name = "CrmActivityIdempotencyConflictError";
  }
}

export class CrmPipelineNotFoundError extends Error {
  constructor(pipelineId: string) {
    super(`CRM pipeline not found: ${pipelineId}`);
    this.name = "CrmPipelineNotFoundError";
  }
}
