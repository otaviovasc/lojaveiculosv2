import type {
  InventoryResaleAnalysisRequest,
  InventoryResaleAnalysisResponse,
} from "../../features/inventory/controllers/inventoryEnrichmentTypes.js";
import { InventoryEnrichmentProviderError } from "./inventoryEnrichmentProviderError.js";

const defaultModel = "gpt-5-mini";
const responsesUrl = "https://api.openai.com/v1/responses";

export type OpenAiVehicleAnalysisProvider = {
  analyze: (
    input: InventoryResaleAnalysisRequest,
  ) => Promise<InventoryResaleAnalysisResponse>;
};

export function createOpenAiVehicleAnalysisProvider({
  apiKey,
  fetch = globalThis.fetch,
  model = defaultModel,
}: {
  apiKey?: string | undefined;
  fetch?: typeof globalThis.fetch;
  model?: string;
} = {}): OpenAiVehicleAnalysisProvider {
  return {
    async analyze(input) {
      if (!apiKey) {
        throw new InventoryEnrichmentProviderError(
          "API_OPENAI_KEY is not configured.",
          503,
        );
      }

      const response = await fetch(responsesUrl, {
        body: JSON.stringify(createOpenAiRequest(model, input)),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new InventoryEnrichmentProviderError(
          `AI resale analysis failed with status ${response.status}.`,
          response.status === 401 || response.status === 403 ? 502 : 503,
        );
      }

      return parseAnalysisResponse(await response.json());
    },
  };
}

function createOpenAiRequest(
  model: string,
  input: InventoryResaleAnalysisRequest,
) {
  return {
    input: [
      {
        content: [
          {
            text: [
              "Voce e um avaliador comercial de loja brasileira de seminovos.",
              "Analise liquidez, risco de margem, FIPE, km por ano, cor, cambio, combustivel e versao.",
              "Seja pratico, especifico e escreva em portugues do Brasil.",
              "Nao invente historico, unico dono, revisoes, blindagem ou estado de conservacao sem dados.",
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
              businessRules: {
                recommendedAcquisition: "18% abaixo da FIPE",
                recommendedSelling: "3% abaixo da FIPE",
              },
              vehicle: input,
            }),
            type: "input_text",
          },
        ],
        role: "user",
      },
    ],
    max_output_tokens: 1200,
    model,
    text: {
      format: {
        name: "vehicle_resale_analysis",
        schema: analysisSchema,
        strict: true,
        type: "json_schema",
      },
    },
  };
}

const analysisSchema = {
  additionalProperties: false,
  properties: {
    riskLevel: { enum: ["low", "medium", "high"], type: "string" },
    suggestedDescription: { type: "string" },
    summary: { type: "string" },
    topics: {
      items: {
        additionalProperties: false,
        properties: {
          code: { enum: ["W", "L"], type: "string" },
          message: { type: "string" },
          title: { type: "string" },
          type: { enum: ["positive", "negative"], type: "string" },
        },
        required: ["type", "code", "title", "message"],
        type: "object",
      },
      type: "array",
    },
  },
  required: ["summary", "riskLevel", "topics", "suggestedDescription"],
  type: "object",
};

function parseAnalysisResponse(
  payload: unknown,
): InventoryResaleAnalysisResponse {
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new InventoryEnrichmentProviderError(
      "AI resale analysis returned no text.",
      502,
    );
  }

  const parsed = JSON.parse(outputText) as InventoryResaleAnalysisResponse;
  if (!isAnalysisResponse(parsed)) {
    throw new InventoryEnrichmentProviderError(
      "AI resale analysis returned an invalid shape.",
      502,
    );
  }
  return parsed;
}

function extractOutputText(payload: unknown): string | null {
  const record = asRecord(payload);
  if (!record) return null;
  if (typeof record.output_text === "string") return record.output_text;
  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    const itemRecord = asRecord(item);
    const content = Array.isArray(itemRecord?.content)
      ? itemRecord.content
      : [];
    for (const part of content) {
      const partRecord = asRecord(part);
      if (typeof partRecord?.text === "string") return partRecord.text;
    }
  }
  return null;
}

function isAnalysisResponse(
  value: InventoryResaleAnalysisResponse,
): value is InventoryResaleAnalysisResponse {
  return (
    typeof value.summary === "string" &&
    ["low", "medium", "high"].includes(value.riskLevel) &&
    Array.isArray(value.topics) &&
    typeof value.suggestedDescription === "string"
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
