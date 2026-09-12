export const defaultOpenRouterModel = "openai/gpt-5.4-mini";

type OpenRouterModelPurpose = "documents" | "inventory_resale";

export function resolveOpenRouterConfig(
  env: Record<string, string | undefined>,
  purpose: OpenRouterModelPurpose,
) {
  const purposeModel =
    purpose === "documents"
      ? env.OPENROUTER_DOCUMENTS_MODEL
      : env.OPENROUTER_INVENTORY_RESALE_MODEL;

  return {
    apiKey: readUsableValue(env.OPENROUTER_API_KEY),
    model:
      readUsableValue(purposeModel) ??
      readUsableValue(env.OPENROUTER_DEFAULT_MODEL) ??
      defaultOpenRouterModel,
  };
}

function readUsableValue(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || /^keepme(?:_|-)/i.test(normalized)) return undefined;
  return normalized;
}
