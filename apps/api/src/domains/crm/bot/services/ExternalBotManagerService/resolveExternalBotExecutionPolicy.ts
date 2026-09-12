import type {
  ExternalBotActionName,
  ExternalBotScope,
} from "../../externalBotModels.js";
import type { ExternalBotManagerPorts } from "../../ports/externalBotPorts.js";
import { evaluateExternalBotPolicy } from "../../policies/externalBotPolicy.js";

export async function resolveExternalBotExecutionPolicy(
  scope: ExternalBotScope,
  action: ExternalBotActionName,
  humanTakeover: boolean,
  ports: ExternalBotManagerPorts,
) {
  const snapshot = await ports.policyResolver.resolve(scope, action);
  if (!snapshot)
    return {
      allowed: false as const,
      code: "policy_disabled" as const,
      configuredMode: "disabled" as const,
    };
  return {
    ...evaluateExternalBotPolicy({ ...snapshot, humanTakeover }),
    configuredMode: snapshot.policy.mode,
  };
}
