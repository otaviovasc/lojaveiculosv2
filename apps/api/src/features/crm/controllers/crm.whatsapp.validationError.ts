export class CrmWhatsappValidationError extends Error {
  constructor(message = "Request is invalid.") {
    super(message);
    this.name = "CrmWhatsappValidationError";
  }
}
