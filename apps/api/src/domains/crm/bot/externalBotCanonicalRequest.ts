import type {
  ExternalBotCommand,
  ExternalBotScope,
} from "./externalBotModels.js";

export type ExternalBotActionRequest = ExternalBotScope & {
  capabilityGrant: string;
  command: ExternalBotCommand;
  expectedAttendanceRevision: number;
  expectedRevision: number;
  idempotencyKey: string;
  requestDigest: string;
};

export function canonicalExternalBotActionRequest(
  input: Omit<ExternalBotActionRequest, "requestDigest">,
): string {
  const { capabilityGrant: _capabilityGrant, ...authorization } = input;
  return JSON.stringify(sortValue(normalizeCommandForDigest(authorization)));
}

// The reply text is composed after the grant is issued, so it cannot bind the
// digest. Every other command keeps its exact payload to preserve digest parity.
function normalizeCommandForDigest(
  authorization: Omit<
    ExternalBotActionRequest,
    "requestDigest" | "capabilityGrant"
  >,
): Omit<ExternalBotActionRequest, "requestDigest" | "capabilityGrant"> {
  const command = authorization.command;
  if (command.action !== "message.send_text") return authorization;
  return {
    ...authorization,
    command: { action: "message.send_text", payload: { text: "" } },
  };
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
