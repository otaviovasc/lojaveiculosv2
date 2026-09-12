export type BillingWebhookRateLimitInput = {
  provider: "asaas";
  sourceFingerprint: string;
};

export type BillingWebhookRateLimitResult =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type BillingWebhookRateLimiter = {
  consume: (
    input: BillingWebhookRateLimitInput,
  ) => Promise<BillingWebhookRateLimitResult>;
};

export class BillingWebhookRateLimiterUnavailableError extends Error {
  constructor() {
    super("Billing webhook rate limiter is unavailable.");
    this.name = "BillingWebhookRateLimiterUnavailableError";
  }
}
