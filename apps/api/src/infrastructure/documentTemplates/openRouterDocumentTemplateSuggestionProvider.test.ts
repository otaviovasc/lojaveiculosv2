import { describe, expect, it, vi } from "vitest";
import { createOpenRouterDocumentTemplateSuggestionProvider } from "./openRouterDocumentTemplateSuggestionProvider.js";

describe("OpenRouter document template suggestion provider", () => {
  it("uses the OpenRouter Responses API with strict structured output", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              clauses: ["Cláusula revisada."],
              summary: "Texto simplificado.",
              title: "Contrato revisado",
            }),
          }),
        ),
    );
    const provider = createOpenRouterDocumentTemplateSuggestionProvider({
      apiKey: "openrouter-key",
      fetch,
    });

    const suggestion = await provider.suggest({
      blocks: [{ body: "Cláusula original.", type: "clause" }],
      clauses: ["Cláusula original."],
      instruction: "Simplifique o texto.",
      templateKey: "sale_contract",
      title: "Contrato",
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://openrouter.ai/api/v1/responses");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer openrouter-key",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      input: [{ type: "message" }, { type: "message" }],
      model: "openai/gpt-5.4-mini",
      provider: {
        data_collection: "deny",
        require_parameters: true,
      },
      text: {
        format: {
          name: "document_template_suggestion",
          strict: true,
          type: "json_schema",
        },
      },
    });
    expect(suggestion).toMatchObject({
      appliedClauses: ["Cláusula revisada."],
      appliedTitle: "Contrato revisado",
      summary: "Texto simplificado.",
    });
  });

  it.each([
    {
      body: "not-json",
      label: "a malformed HTTP response",
    },
    {
      body: JSON.stringify({
        output_text: JSON.stringify({ clauses: "invalid" }),
      }),
      label: "structured output with an invalid shape",
    },
  ])("rejects $label without leaking parser errors", async ({ body }) => {
    const provider = createOpenRouterDocumentTemplateSuggestionProvider({
      apiKey: "openrouter-key",
      fetch: async () => new Response(body),
    });

    await expect(
      provider.suggest({
        blocks: [],
        clauses: ["Cláusula original."],
        instruction: "Simplifique o texto.",
        templateKey: "sale_contract",
        title: "Contrato",
      }),
    ).rejects.toThrow("Document AI suggestion returned an invalid response.");
  });
});
