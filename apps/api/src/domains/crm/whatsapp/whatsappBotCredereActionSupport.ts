import type {
  CrmFinancingBotReadiness,
  CrmFinancingBotResult,
} from "../ports/crmFinancingBotActions.js";

export function safeCredereReadinessResult(input: CrmFinancingBotReadiness) {
  return {
    ...(input.missingRequirements
      ? { missingRequirements: input.missingRequirements.map(redactText) }
      : {}),
    provider: input.provider,
    ready: input.ready,
    status: input.status,
    ...(input.usableBankCount !== undefined
      ? { usableBankCount: input.usableBankCount }
      : {}),
    ...(input.usableBanks
      ? {
          usableBanks: input.usableBanks.map((bank) => ({
            code: bank.code,
            name: bank.name ? redactText(bank.name) : null,
          })),
        }
      : {}),
  };
}

export function safeCredereBotResult(
  input: CrmFinancingBotResult,
): CrmFinancingBotResult {
  if (typeof input === "string") return redactText(input);
  if (input === null || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(safeCredereBotResult);
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => !isForbiddenBotKey(key))
      .map(([key, value]) => [key, safeCredereBotResult(value)]),
  );
}

function isForbiddenBotKey(key: string) {
  return [
    "Store-Id",
    "credereStoreId",
    "credereVehicleModelId",
    "externalStoreId",
    "providerPayload",
    "providerStoreId",
    "raw",
    "sellerCpf",
    "storeId",
    "tenantId",
    "vehicleMolicarCode",
  ].includes(key);
}

function redactText(value: string) {
  return value
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[redacted-email]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[redacted-document]")
    .replace(
      /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
      "[redacted-document]",
    );
}
