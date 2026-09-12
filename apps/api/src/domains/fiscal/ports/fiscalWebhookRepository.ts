export type FiscalWebhookEventStatus =
  "failed" | "ignored" | "processed" | "received";

export type FiscalWebhookEvent = {
  id: string;
  providerEventId: string;
  status: FiscalWebhookEventStatus;
};

export type FiscalWebhookRepository = {
  recordReceived: (input: {
    environment: string;
    eventType: string;
    payload: Record<string, unknown>;
    providerEventId: string;
  }) => Promise<{ created: boolean; event: FiscalWebhookEvent }>;
  updateStatus: (input: {
    errorMessage?: string;
    eventId: string;
    status: Exclude<FiscalWebhookEventStatus, "received">;
    storeId?: string;
    tenantId?: string;
  }) => Promise<void>;
};
