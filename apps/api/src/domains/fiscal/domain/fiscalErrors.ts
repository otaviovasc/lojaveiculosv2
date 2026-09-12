export class FiscalDocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Fiscal document not found: ${documentId}`);
    this.name = "FiscalDocumentNotFoundError";
  }
}

export class FiscalDocumentCancellationNotAllowedError extends Error {
  constructor(readonly status: string) {
    super(`Fiscal document cannot be cancelled while its status is ${status}.`);
    this.name = "FiscalDocumentCancellationNotAllowedError";
  }
}

export class FiscalDocumentRepeatNotAllowedError extends Error {
  constructor(readonly status: string) {
    super(`Fiscal document cannot be repeated while its status is ${status}.`);
    this.name = "FiscalDocumentRepeatNotAllowedError";
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
