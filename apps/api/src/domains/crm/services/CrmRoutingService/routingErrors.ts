import type { CrmRoutingBlockedCode } from "./routingReadModels.js";

export class CrmRoutingPolicyValidationError extends Error {
  constructor(
    message: string,
    readonly reason: CrmRoutingBlockedCode,
  ) {
    super(message);
    this.name = "CrmRoutingPolicyValidationError";
  }
}
