import type {
  CrmChannel,
  ExternalBotAction,
  ExternalBotPolicyMode,
} from "@lojaveiculosv2/shared";

export const externalBotGuardrailMaximums = {
  connectionRatePerMinute: 120,
  cooldownSeconds: 86_400,
  dailyLimit: 10_000,
} as const;

export type ExternalBotPolicy = {
  action: ExternalBotAction;
  channel: CrmChannel;
  connectionRatePerMinute: number;
  cooldownSeconds: number;
  dailyLimit: number;
  mode: ExternalBotPolicyMode;
};

export type ExternalBotPolicyInput = Omit<
  ExternalBotPolicy,
  "action" | "channel"
> & {
  action: ExternalBotAction;
  channel: CrmChannel;
};

export type ExternalBotPolicyRejectionCode =
  | "connection_not_ready"
  | "cooldown_active"
  | "daily_limit_reached"
  | "human_takeover"
  | "policy_disabled"
  | "rate_limit_reached";

export function normalizeExternalBotPolicy(
  input: ExternalBotPolicyInput,
): ExternalBotPolicy {
  if (
    input.cooldownSeconds < 0 ||
    input.cooldownSeconds > externalBotGuardrailMaximums.cooldownSeconds ||
    input.connectionRatePerMinute < 0 ||
    input.connectionRatePerMinute >
      externalBotGuardrailMaximums.connectionRatePerMinute ||
    input.dailyLimit < 0 ||
    input.dailyLimit > externalBotGuardrailMaximums.dailyLimit
  ) {
    throw new Error("External bot guardrail exceeds the server-owned maximum.");
  }
  return { ...input };
}

export function evaluateExternalBotPolicy(input: {
  connectionReady: boolean;
  humanTakeover: boolean;
  policy: ExternalBotPolicy;
  secondsSinceLastAction: number | null;
  connectionActionsInLastMinute: number;
  actionsToday: number;
}) {
  const policy = normalizeExternalBotPolicy(input.policy);
  if (policy.mode === "disabled") return rejected("policy_disabled");
  if (input.humanTakeover) return rejected("human_takeover");
  if (!input.connectionReady) return rejected("connection_not_ready");
  if (
    input.secondsSinceLastAction !== null &&
    input.secondsSinceLastAction < policy.cooldownSeconds
  ) {
    return rejected("cooldown_active");
  }
  if (input.connectionActionsInLastMinute >= policy.connectionRatePerMinute) {
    return rejected("rate_limit_reached");
  }
  if (input.actionsToday >= policy.dailyLimit) {
    return rejected("daily_limit_reached");
  }
  return { allowed: true as const, mode: policy.mode };
}

function rejected(code: ExternalBotPolicyRejectionCode) {
  return { allowed: false as const, code };
}
