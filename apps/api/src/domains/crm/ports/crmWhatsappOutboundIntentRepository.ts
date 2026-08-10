export type OutboundIntentResult = Record<string, unknown>;
export type OutboundIntent = {
  claimToken: string;
  fingerprint: string;
  id: string;
  messageId: string | null;
  providerResult: OutboundIntentResult | null;
  recoveryExpiresAt: Date | null;
  startedAt: Date;
  status: "completed" | "indeterminate" | "provider_succeeded" | "started";
};

export type ClaimOutboundIntentResult =
  | { intent: OutboundIntent; kind: "claimed" }
  | {
      intent: OutboundIntent;
      kind:
        "completed" | "indeterminate" | "in_progress" | "provider_succeeded";
    }
  | { kind: "conflict" };

export type CrmWhatsappOutboundIntentRepository = {
  claim(input: {
    connectionId: string;
    fingerprint: string;
    idempotencyKey: string;
    now: Date;
    sessionId: string | null;
    staleBefore: Date;
    storeId: string;
    tenantId: string;
  }): Promise<ClaimOutboundIntentResult>;
  complete(input: {
    claimToken: string;
    id: string;
    messageId: string;
    sessionId: string;
  }): Promise<void>;
  markIndeterminate(input: { claimToken: string; id: string }): Promise<void>;
  recordProviderSuccess(input: {
    claimToken: string;
    id: string;
    providerResult: OutboundIntentResult;
  }): Promise<void>;
  purgeExpiredRecoveryPayloads(input: {
    limit: number;
    now: Date;
  }): Promise<number>;
};
