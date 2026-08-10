export class WhatsappWebhookEventRetryError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409 | 422,
  ) {
    super(message);
    this.name = "WhatsappWebhookEventRetryError";
  }
}
