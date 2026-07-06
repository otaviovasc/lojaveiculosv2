export class BillingWebhookAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingWebhookAuthenticationError";
  }
}

export class BillingWebhookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingWebhookValidationError";
  }
}
