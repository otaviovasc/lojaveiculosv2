import type { CrmMessage } from "./crmConversationTypes";

export function readCrmFailedSendStatus(
  error: unknown,
): Extract<CrmMessage["status"], "FAILED" | "INDETERMINATE"> {
  const code = readErrorString(error, "code").toLowerCase();
  if (
    code.includes("indeterminate") ||
    code.includes("unconfirmed") ||
    code.includes("timeout") ||
    code.includes("request_failed")
  ) {
    return "INDETERMINATE";
  }

  const status = readErrorNumber(error, "status");
  if (
    status !== null &&
    status >= 400 &&
    status < 500 &&
    ![408, 425, 429].includes(status)
  ) {
    return "FAILED";
  }

  // Network errors and provider/server failures may happen after acceptance.
  // Reconciliation is safer than creating a second provider request.
  return "INDETERMINATE";
}

function readErrorString(error: unknown, key: string) {
  if (!error || typeof error !== "object" || !(key in error)) return "";
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function readErrorNumber(error: unknown, key: string) {
  if (!error || typeof error !== "object" || !(key in error)) return null;
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
