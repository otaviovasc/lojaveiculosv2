export const openApiSecuritySchemes = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description:
      "Bearer token representing an actor with tenant and store scoped permissions.",
  },
  externalApiKey: {
    type: "apiKey",
    in: "header",
    name: "x-api-key",
    description:
      "Scoped Loja Veiculos API key. Authorization: Bearer lv2_... is also accepted.",
  },
  externalApiBearer: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "Loja Veiculos API key",
    description: "Alternative transport for a scoped lv2_... API key.",
  },
} as const;
