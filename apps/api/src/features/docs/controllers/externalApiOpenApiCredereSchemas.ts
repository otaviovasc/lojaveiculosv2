const nullableString = {
  anyOf: [{ type: "string" }, { type: "null" }],
} as const;

const positiveCents = { type: "integer", minimum: 1 } as const;
const bankCodes = {
  type: "array",
  maxItems: 20,
  items: { type: "string", minLength: 2, maxLength: 32 },
} as const;

export const externalApiCredereSchemas = {
  CrederePreflightRequest: {
    type: "object",
    additionalProperties: false,
    required: ["document"],
    properties: {
      bankCodes,
      document: {
        type: "string",
        description: "Valid CPF or CNPJ; punctuation is accepted.",
      },
    },
  },
  CredereSimulationRequest: {
    type: "object",
    additionalProperties: false,
    required: ["applicant", "consent", "terms", "vehicle"],
    properties: {
      applicant: {
        type: "object",
        additionalProperties: false,
        required: ["document", "name", "phone"],
        properties: {
          birthDate: { type: "string", format: "date" },
          document: { type: "string" },
          email: { type: "string", format: "email" },
          hasCnh: { type: "boolean" },
          monthlyIncomeCents: positiveCents,
          name: { type: "string", minLength: 1, maxLength: 256 },
          phone: { type: "string", minLength: 10, maxLength: 20 },
        },
      },
      consent: {
        type: "object",
        additionalProperties: false,
        required: ["creditSimulation", "personalData"],
        properties: {
          creditSimulation: { type: "boolean", const: true },
          personalData: { type: "boolean", const: true },
        },
      },
      leadId: { type: "string", minLength: 1, maxLength: 128 },
      listingId: { type: "string", minLength: 1, maxLength: 128 },
      terms: {
        type: "object",
        additionalProperties: false,
        required: ["downPaymentCents", "installmentCounts"],
        properties: {
          accessoryValueCents: positiveCents,
          documentationValueCents: positiveCents,
          downPaymentCents: positiveCents,
          financedAmountCents: positiveCents,
          installmentCounts: {
            type: "array",
            minItems: 1,
            maxItems: 12,
            uniqueItems: true,
            items: { type: "integer", minimum: 1, maximum: 120 },
          },
          insuranceValueCents: positiveCents,
          processBankSuggestedConditions: { type: "boolean", default: true },
          requestedBankCodes: bankCodes,
        },
      },
      unitId: { type: "string", minLength: 1, maxLength: 128 },
      vehicle: {
        type: "object",
        additionalProperties: false,
        required: [
          "licensingCity",
          "licensingUf",
          "manufactureYear",
          "modelYear",
          "molicarCode",
          "priceCents",
        ],
        properties: {
          credereVehicleModelId: { type: "string" },
          fipeCode: { type: "string", pattern: "^\\d{6}-\\d$" },
          licensingCity: { type: "string", minLength: 1, maxLength: 256 },
          licensingUf: { type: "string", pattern: "^[A-Z]{2}$" },
          manufactureYear: { type: "integer", minimum: 1900 },
          modelYear: { type: "integer", minimum: 1900 },
          molicarCode: { type: "string", minLength: 3, maxLength: 32 },
          priceCents: positiveCents,
          zeroKm: { type: "boolean" },
        },
      },
    },
  },
  CrederePreflightResponse: {
    type: "object",
    additionalProperties: false,
    required: ["data"],
    properties: {
      data: {
        type: "object",
        additionalProperties: false,
        required: ["applicant", "readiness"],
        properties: {
          applicant: {
            type: "object",
            additionalProperties: true,
            required: ["knownLead", "missingFields", "requirements"],
            properties: {
              applicant: {
                anyOf: [
                  { type: "object", additionalProperties: true },
                  { type: "null" },
                ],
              },
              knownLead: { type: "boolean" },
              missingFields: { type: "array", items: { type: "string" } },
              requirements: { type: "object", additionalProperties: true },
            },
          },
          readiness: {
            type: "object",
            additionalProperties: false,
            required: ["configured", "mappedStoreAlias", "usableBanks"],
            properties: {
              configured: { type: "boolean" },
              mappedStoreAlias: nullableString,
              usableBanks: { type: "array", items: {} },
            },
          },
        },
      },
    },
  },
  CredereSimulationResponse: {
    type: "object",
    additionalProperties: false,
    required: ["data"],
    properties: {
      data: {
        type: "object",
        additionalProperties: true,
        required: ["conditions", "inquiryId"],
        properties: {
          conditions: { type: "array", items: { type: "object" } },
          inquiryId: { type: "string" },
          leadId: { type: "string" },
          listingId: { type: "string" },
          status: { type: "string" },
          unitId: { type: "string" },
        },
      },
    },
  },
} as const;
