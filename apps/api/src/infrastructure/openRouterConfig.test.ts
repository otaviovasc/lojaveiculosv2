import { describe, expect, it } from "vitest";
import {
  defaultOpenRouterModel,
  resolveOpenRouterConfig,
} from "./openRouterConfig.js";

describe("OpenRouter runtime configuration", () => {
  it("uses purpose-specific models before the shared default", () => {
    const env = {
      OPENROUTER_API_KEY: " key ",
      OPENROUTER_DEFAULT_MODEL: "openai/default",
      OPENROUTER_DOCUMENTS_MODEL: " openai/documents ",
      OPENROUTER_INVENTORY_RESALE_MODEL: "openai/resale",
    };

    expect(resolveOpenRouterConfig(env, "documents")).toEqual({
      apiKey: "key",
      model: "openai/documents",
    });
    expect(resolveOpenRouterConfig(env, "inventory_resale")).toEqual({
      apiKey: "key",
      model: "openai/resale",
    });
  });

  it("treats blank and keepme values as unavailable configuration", () => {
    expect(
      resolveOpenRouterConfig(
        {
          OPENROUTER_API_KEY: "keepme_OPENROUTER_API_KEY",
          OPENROUTER_DEFAULT_MODEL: " ",
          OPENROUTER_INVENTORY_RESALE_MODEL: "keepme-model",
        },
        "inventory_resale",
      ),
    ).toEqual({
      apiKey: undefined,
      model: defaultOpenRouterModel,
    });
  });
});
