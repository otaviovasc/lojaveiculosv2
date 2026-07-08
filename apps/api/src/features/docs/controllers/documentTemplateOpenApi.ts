const looseBlockSchema = { type: "object", additionalProperties: true };

export const documentTemplateSchemas = {
  DocumentTemplate: {
    type: "object",
    additionalProperties: false,
    required: [
      "availableVariables",
      "blocks",
      "category",
      "clauses",
      "context",
      "defaultBlocks",
      "defaultClauses",
      "defaultTitle",
      "description",
      "isCustomized",
      "kind",
      "mode",
      "source",
      "templateKey",
      "title",
      "updatedAt",
    ],
    properties: {
      availableVariables: { type: "array", items: { type: "string" } },
      blocks: { type: "array", items: looseBlockSchema },
      category: { type: "string" },
      clauses: { type: "array", items: { type: "string" } },
      context: { type: "string" },
      defaultBlocks: { type: "array", items: looseBlockSchema },
      defaultClauses: { type: "array", items: { type: "string" } },
      defaultTitle: { type: "string" },
      description: { type: "string" },
      isCustomized: { type: "boolean" },
      kind: { type: "string" },
      mode: { enum: ["editable", "locked"], type: "string" },
      source: { enum: ["store", "system"], type: "string" },
      templateKey: { type: "string" },
      title: { type: "string" },
      updatedAt: { type: ["string", "null"], format: "date-time" },
    },
  },
  DocumentTemplateSuggestionOutcomeRequest: {
    type: "object",
    additionalProperties: false,
    required: ["diffCount", "outcome"],
    properties: {
      diffCount: { type: "integer", minimum: 0, maximum: 80 },
      outcome: { enum: ["accepted", "rejected"], type: "string" },
    },
  },
  DocumentTemplateSuggestionOutcomeResponse: {
    type: "object",
    additionalProperties: false,
    required: ["recordedAt"],
    properties: { recordedAt: { type: "string", format: "date-time" } },
  },
  DocumentTemplateSuggestionRequest: {
    type: "object",
    additionalProperties: false,
    required: ["clauses", "instruction", "title"],
    properties: {
      blocks: { type: "array", items: looseBlockSchema },
      clauses: { type: "array", items: { type: "string" }, minItems: 1 },
      instruction: { type: "string", minLength: 3 },
      title: { type: "string", minLength: 1 },
    },
  },
  DocumentTemplateSuggestionResponse: {
    type: "object",
    additionalProperties: true,
  },
  DocumentTemplatesResponse: {
    type: "object",
    additionalProperties: false,
    required: ["templates"],
    properties: {
      templates: {
        type: "array",
        items: { $ref: "#/components/schemas/DocumentTemplate" },
      },
    },
  },
  UpdateDocumentTemplateRequest: {
    type: "object",
    additionalProperties: false,
    required: ["clauses", "title"],
    properties: {
      blocks: { type: "array", items: looseBlockSchema },
      clauses: { type: "array", items: { type: "string" }, minItems: 1 },
      title: { type: "string", minLength: 1 },
    },
  },
} as const;

export const documentTemplatePaths = {
  "/api/v1/documents/templates": {
    get: {
      tags: ["Documents"],
      summary: "List store document templates",
      operationId: "listDocumentTemplates",
      security: [{ bearerAuth: ["documents.read"] }],
      responses: templateListResponses(),
    },
  },
  "/api/v1/documents/templates/{templateKey}": {
    put: {
      tags: ["Documents"],
      summary: "Update one editable store document template",
      operationId: "updateDocumentTemplate",
      security: [{ bearerAuth: ["documents.template_update"] }],
      parameters: [templateKeyParameter()],
      requestBody: jsonBody("UpdateDocumentTemplateRequest"),
      responses: templateMutationResponses("Updated document template."),
    },
  },
  "/api/v1/documents/templates/{templateKey}/suggestions": {
    post: {
      tags: ["Documents"],
      summary: "Suggest document template edits with a reviewable diff",
      operationId: "suggestDocumentTemplateEdit",
      security: [{ bearerAuth: ["documents.template_update"] }],
      parameters: [templateKeyParameter()],
      requestBody: jsonBody("DocumentTemplateSuggestionRequest"),
      responses: templateMutationResponses("Generated template suggestion."),
    },
  },
  "/api/v1/documents/templates/{templateKey}/suggestions/outcome": {
    post: {
      tags: ["Documents"],
      summary: "Record accepted or rejected document template suggestion",
      operationId: "recordDocumentTemplateSuggestionOutcome",
      security: [{ bearerAuth: ["documents.template_update"] }],
      parameters: [templateKeyParameter()],
      requestBody: jsonBody("DocumentTemplateSuggestionOutcomeRequest"),
      responses: templateMutationResponses(
        "Recorded suggestion outcome.",
        "DocumentTemplateSuggestionOutcomeResponse",
      ),
    },
  },
} as const;

function jsonBody(schema: string) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schema}` },
      },
    },
  };
}

function templateKeyParameter() {
  return {
    in: "path",
    name: "templateKey",
    required: true,
    schema: { type: "string" },
  };
}

function templateListResponses() {
  return {
    "200": {
      description: "Templates with defaults and customization metadata.",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/DocumentTemplatesResponse" },
        },
      },
    },
    "401": { description: "Authentication is required." },
    "403": { description: "documents.read permission is required." },
  };
}

function templateMutationResponses(
  description: string,
  schema = "DocumentTemplate",
) {
  return {
    "200": {
      description,
      content: {
        "application/json": {
          schema: { $ref: `#/components/schemas/${schema}` },
        },
      },
    },
    "400": { description: "Request body or template key is invalid." },
    "401": { description: "Authentication is required." },
    "403": { description: "documents.template_update permission is required." },
  };
}
