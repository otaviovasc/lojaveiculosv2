import type { AutomationRunStatus, AutomationStepStatus } from "./models.js";

export class AutomationRunNotFoundError extends Error {
  constructor() {
    super("Automation run was not found.");
    this.name = "AutomationRunNotFoundError";
  }
}

export class AutomationStepNotFoundError extends Error {
  constructor() {
    super("Automation step was not found.");
    this.name = "AutomationStepNotFoundError";
  }
}

export class AutomationApprovalNotFoundError extends Error {
  constructor() {
    super("Automation approval was not found.");
    this.name = "AutomationApprovalNotFoundError";
  }
}

export class AutomationInvalidTransitionError extends Error {
  constructor(current: AutomationRunStatus | AutomationStepStatus) {
    super(`Automation cannot transition from ${current}.`);
    this.name = "AutomationInvalidTransitionError";
  }
}

export class AutomationStaleVersionError extends Error {
  constructor() {
    super("Automation run changed after it was loaded.");
    this.name = "AutomationStaleVersionError";
  }
}

export class AutomationStaleApprovalError extends Error {
  constructor() {
    super("Automation preview or approval changed after it was loaded.");
    this.name = "AutomationStaleApprovalError";
  }
}

export class AutomationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutomationInputError";
  }
}
