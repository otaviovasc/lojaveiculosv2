export type CrmPushDeliveryRequest = {
  body: string;
  data: Readonly<Record<string, string>>;
  heading: string;
  iconUrl: string;
  idempotencyKey: string;
  subscriptionIds: readonly string[];
  topic: string;
  ttlSeconds: number;
  webUrl: string;
};

export type CrmPushDeliveryResult =
  | {
      invalidSubscriptionIds: readonly string[];
      kind: "accepted";
      providerNotificationId: string;
    }
  | {
      errorCode: string;
      invalidSubscriptionIds: readonly string[];
      kind: "permanent_failure";
    }
  | {
      errorCode: string;
      kind: "retryable_failure";
      retryAfterMs?: number;
    };

export type CrmPushDeliveryProvider = {
  send(request: CrmPushDeliveryRequest): Promise<CrmPushDeliveryResult>;
};
