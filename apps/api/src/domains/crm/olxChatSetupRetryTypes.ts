export type OlxChatRetryStage =
  | "audit"
  | "callback"
  | "dispatch"
  | "finalization"
  | "provider"
  | "routing"
  | "vault";

export type RetryOlxChatSetupResult = {
  channel: "olx_chat";
  connectionId: string;
  diagnostics: {
    httpStatus: number;
    providerRequestId: string | null;
    retryable: false;
  };
  provider: "olx";
  readiness: { ready: true };
  setup: {
    attemptCount: number;
    configuredAt: string;
    status: "configured";
  };
};
