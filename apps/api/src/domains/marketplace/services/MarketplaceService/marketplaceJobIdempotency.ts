import { createHash } from "node:crypto";
import type { CreateMarketplaceJobInput } from "../../ports/marketplaceRepository.js";

export function marketplaceJobIdempotencyKey(
  input: Pick<CreateMarketplaceJobInput, "jobType" | "metadata" | "provider">,
) {
  const batchId = readString(input.metadata.batchId);
  const commandId = readString(input.metadata.commandId);
  const listingId = readString(input.metadata.listingId);
  const retryOfJobId = readString(input.metadata.retryOfJobId);
  const operationId = retryOfJobId
    ? `retry:${retryOfJobId}`
    : batchId
      ? `batch:${batchId}`
      : commandId
        ? `command:${commandId}`
        : null;
  if (!listingId || !operationId) return null;
  return createHash("sha256")
    .update([input.provider, input.jobType, listingId, operationId].join("\0"))
    .digest("hex");
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
