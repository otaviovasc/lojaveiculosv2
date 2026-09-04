import type { CrmCoreResource } from "./models.js";

export class CrmCoreNotFoundError extends Error {
  constructor(resource: CrmCoreResource, id: string) {
    super(`${resource} record not found: ${id}`);
    this.name = "CrmCoreNotFoundError";
  }
}

export class CrmCoreRevisionConflictError extends Error {
  constructor(expected: number, actual: number) {
    super(`Expected revision ${expected}, but current revision is ${actual}.`);
    this.name = "CrmCoreRevisionConflictError";
  }
}

export class CrmCoreRuleError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "CrmCoreRuleError";
  }
}
