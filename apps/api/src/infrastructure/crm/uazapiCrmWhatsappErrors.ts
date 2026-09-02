import { CrmMessagingGatewayError } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  readRecord,
  readString,
  redactUazapiTokenInText,
} from "./uazapiCrmWhatsappGatewaySupport.js";

/**
 * Uazapi answers failed sends with HTTP 200 and `{ error: true, message }`
 * (for example on a disconnected instance), so the body must always be
 * inspected, not just the status code. Some deployments serialize the same
 * failure with `error` as a plain string, which must also be treated as a
 * failure — never as a successful send.
 */
export function ensureUazapiOk(
  payload: Record<string, unknown>,
  label: string,
  token?: string,
) {
  const stringError = readString(payload.error);
  if (payload.error !== true && !stringError) return;
  const raw =
    readString(payload.message) ??
    stringError ??
    readString(readRecord(payload.response).message) ??
    readString(payload.response) ??
    "provider returned an error";
  throw new CrmMessagingGatewayError(
    redactUazapiTokenInText(`${label} failed: ${raw}`, token),
    502,
    undefined,
    "provider_rejected",
  );
}

/**
 * Builds the error for a non-2xx uazapi response. Uazapi error bodies carry
 * the failure reason as `{ error: "..." }` (string form) or
 * `{ message: "..." }`; surface it (token-redacted) so operators see the real
 * provider rejection instead of a bare HTTP status.
 */
export function uazapiProviderResponseError(
  status: number,
  label: string,
  token?: string,
  payload?: Record<string, unknown>,
) {
  const detail = payload ? readUazapiErrorDetail(payload) : null;
  return new CrmMessagingGatewayError(
    redactUazapiTokenInText(
      `${label} failed with HTTP ${status}${detail ? `: ${detail}` : ""}`,
      token,
    ),
    status === 429 ? 429 : 502,
    status === 429 ? 1 : undefined,
    status === 429
      ? "rate_limited"
      : status >= 500
        ? "provider_unavailable"
        : "provider_rejected",
  );
}

function readUazapiErrorDetail(payload: Record<string, unknown>) {
  if (payload.error === true) {
    return (
      readString(payload.message) ??
      readString(readRecord(payload.response).message)
    );
  }
  return (
    readString(payload.error) ??
    readString(payload.message) ??
    readString(readRecord(payload.response).message)
  );
}
