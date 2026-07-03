export class WhatsappSessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`CRM WhatsApp session not found: ${sessionId}`);
    this.name = "WhatsappSessionNotFoundError";
  }
}

export class WhatsappMessageNotFoundError extends Error {
  constructor(messageId: string) {
    super(`CRM WhatsApp message not found: ${messageId}`);
    this.name = "WhatsappMessageNotFoundError";
  }
}

export class WhatsappMessageActionError extends Error {
  readonly status: 400 | 409 | 422;

  constructor(message: string, status: 400 | 409 | 422 = 422) {
    super(message);
    this.name = "WhatsappMessageActionError";
    this.status = status;
  }
}

export class WhatsappConnectionNotFoundError extends Error {
  constructor(connectionId: string) {
    super(`CRM WhatsApp connection not found: ${connectionId}`);
    this.name = "WhatsappConnectionNotFoundError";
  }
}

export class WhatsappUnsupportedProviderError extends Error {
  constructor(provider: string) {
    super(`Unsupported CRM WhatsApp provider: ${provider}`);
    this.name = "WhatsappUnsupportedProviderError";
  }
}
