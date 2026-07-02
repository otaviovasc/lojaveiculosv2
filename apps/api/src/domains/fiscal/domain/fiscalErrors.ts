export class FiscalDocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Fiscal document not found: ${documentId}`);
    this.name = "FiscalDocumentNotFoundError";
  }
}

export class FiscalRecipientNotFoundError extends Error {
  constructor(recipientId: string) {
    super(`Fiscal recipient not found: ${recipientId}`);
    this.name = "FiscalRecipientNotFoundError";
  }
}

export class FiscalTemplateNotFoundError extends Error {
  constructor(templateId: string) {
    super(`Fiscal template not found: ${templateId}`);
    this.name = "FiscalTemplateNotFoundError";
  }
}

export class FiscalValidationError extends Error {
  constructor(
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "FiscalValidationError";
  }
}
