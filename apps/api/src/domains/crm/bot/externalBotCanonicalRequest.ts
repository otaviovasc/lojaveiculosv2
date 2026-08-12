import type {
  ExternalBotCommand,
  ExternalBotScope,
} from "./externalBotModels.js";

export type ExternalBotActionRequest = ExternalBotScope & {
  capabilityGrant: string;
  command: ExternalBotCommand;
  expectedRevision: number;
  idempotencyKey: string;
  requestDigest: string;
};

export function canonicalExternalBotActionRequest(
  input: Omit<ExternalBotActionRequest, "requestDigest">,
): string {
  const { capabilityGrant: _capabilityGrant, ...authorization } = input;
  return JSON.stringify(sortValue(authorization));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortValue(nested)]),
  );
}
