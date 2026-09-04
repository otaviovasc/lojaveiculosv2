export class CrmPipelineStageNotFoundError extends Error {
  constructor(stageId: string) {
    super(`CRM pipeline stage not found: ${stageId}`);
    this.name = "CrmPipelineStageNotFoundError";
  }
}

export class CrmPipelineDuplicateNameError extends Error {
  constructor(name: string) {
    super(`CRM pipeline name already exists: ${name}`);
    this.name = "CrmPipelineDuplicateNameError";
  }
}

export class CrmPipelineInUseError extends Error {
  constructor(message = "CRM pipeline is in use by active leads.") {
    super(message);
    this.name = "CrmPipelineInUseError";
  }
}

export class CrmVisitNotFoundError extends Error {
  constructor(visitId: string) {
    super(`CRM visit not found: ${visitId}`);
    this.name = "CrmVisitNotFoundError";
  }
}

export class CrmVisitSessionMismatchError extends Error {
  constructor() {
    super("WhatsApp conversationCycle is not linked to the requested lead.");
    this.name = "CrmVisitSessionMismatchError";
  }
}

export class CrmVisitVehicleNotFoundError extends Error {
  constructor(listingId: string) {
    super(`Vehicle listing not found for CRM visit: ${listingId}`);
    this.name = "CrmVisitVehicleNotFoundError";
  }
}
