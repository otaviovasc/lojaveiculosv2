export type CrmOlxWebhookSecurity = {
  consume: (
    input:
      | { now: Date; scope: "unauthenticated"; sourceFingerprint: string }
      | {
          connectionId: string;
          now: Date;
          provider: "olx";
          scope: "connection";
          storeId: string;
          tenantId: string;
        },
  ) => Promise<boolean>;
  futureSkewMs: number;
  maxAgeMs: number;
  now: () => Date;
};

export class CrmOlxWebhookSecurityUnavailableError extends Error {
  constructor(message = "OLX webhook rate limiting is unavailable.") {
    super(message);
    this.name = "CrmOlxWebhookSecurityUnavailableError";
  }
}
