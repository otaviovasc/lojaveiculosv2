import type {
  DocumentTemplateSuggestion,
  DocumentTemplateSuggestionInput,
  DocumentTemplateSuggestionProvider,
} from "../../domains/documents/ports/documentTemplateSuggestionProvider.js";
import { createDocumentTemplateSuggestionDiff } from "../../domains/documents/documentTemplateSuggestionDiff.js";
import {
  asRecord,
  extractOpenAiResponseOutputText,
} from "../openAiResponses.js";

const defaultModel = "gpt-5.4-mini";
const responsesUrl = "https://api.openai.com/v1/responses";

export function createOpenAiDocumentTemplateSuggestionProvider({
  apiKey,
  fetch = globalThis.fetch,
  model = defaultModel,
}: {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  model?: string;
}): DocumentTemplateSuggestionProvider {
  return {
    async suggest(input) {
      const response = await fetch(responsesUrl, {
        body: JSON.stringify(createRequest(model, input)),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Document AI suggestion failed: ${response.status}`);
      }
      return parseSuggestion(input, await response.json());
    },
  };
}

function createRequest(model: string, input: DocumentTemplateSuggestionInput) {
  return {
    input: [
      {
        content: [
          {
            text: [
              "Voce revisa modelos de documentos de uma loja brasileira de veiculos.",
              "Preserve sentido juridico e operacional, mantenha portugues do Brasil, nao invente dados e nao adicione conselhos legais.",
              "Retorne somente alteracoes propostas; o operador vera diff e aprovara antes de aplicar.",
            ].join(" "),
            type: "input_text",
          },
        ],
        role: "system",
      },
      {
        content: [
          {
            text: JSON.stringify({
              clauses: input.clauses,
              instruction: input.instruction,
              templateKey: input.templateKey,
              title: input.title,
            }),
            type: "input_text",
          },
        ],
        role: "user",
      },
    ],
    max_output_tokens: 1600,
    model,
    text: {
      format: {
        name: "document_template_suggestion",
        schema: suggestionSchema,
        strict: true,
        type: "json_schema",
      },
    },
  };
}

const suggestionSchema = {
  additionalProperties: false,
  properties: {
    clauses: { items: { type: "string" }, type: "array" },
    summary: { type: "string" },
    title: { type: "string" },
  },
  required: ["title", "clauses", "summary"],
  type: "object",
};

function parseSuggestion(
  input: DocumentTemplateSuggestionInput,
  payload: unknown,
): DocumentTemplateSuggestion {
  const text = extractOutputText(payload);
  if (!text) throw new Error("Document AI suggestion returned no text.");
  const parsed = JSON.parse(text) as {
    clauses: string[];
    summary: string;
    title: string;
  };
  const clauses = parsed.clauses.filter((item) => item.trim());
  return {
    appliedBlocks: applyClausesToBlocks(input.blocks, clauses),
    appliedClauses: clauses,
    appliedTitle: parsed.title.trim() || input.title,
    diff: createDocumentTemplateSuggestionDiff(input.clauses, clauses),
    generatedAt: new Date(),
    summary: parsed.summary,
  };
}

function applyClausesToBlocks(
  blocks: readonly Record<string, unknown>[],
  clauses: readonly string[],
) {
  let index = 0;
  return blocks.map((block) => {
    if (typeof block.body !== "string") return block;
    const next = clauses[index];
    index += 1;
    return next ? { ...block, body: next } : block;
  });
}

function extractOutputText(payload: unknown): string | null {
  return extractOpenAiResponseOutputText(payload);
}
