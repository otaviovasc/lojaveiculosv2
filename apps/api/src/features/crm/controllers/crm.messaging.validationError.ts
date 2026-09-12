export type CrmMessagingValidationField = {
  path: string;
  message: string;
};

export class CrmMessagingValidationError extends Error {
  readonly details?: { fields: CrmMessagingValidationField[] };

  constructor(
    message = "Request is invalid.",
    details?: { fields: CrmMessagingValidationField[] },
  ) {
    super(message);
    this.name = "CrmMessagingValidationError";
    if (details) this.details = details;
  }
}
