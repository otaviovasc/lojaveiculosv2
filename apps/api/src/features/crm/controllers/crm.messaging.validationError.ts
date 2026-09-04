export class CrmMessagingValidationError extends Error {
  constructor(message = "Request is invalid.") {
    super(message);
    this.name = "CrmMessagingValidationError";
  }
}
