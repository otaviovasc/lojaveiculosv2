import { externalApiAssignableScopes } from "@lojaveiculosv2/shared";

const nullableEmail = {
  anyOf: [{ type: "string", format: "email" }, { type: "null" }],
} as const;
const nullableName = nullableBoundedText(1, 191);
const nullablePhone = nullableBoundedText(3, 40);
const nullableMessage = nullableBoundedText(1, 2000);
const nullableIdentifier = nullableBoundedText(1);
const leadStatus = {
  type: "string",
  enum: [
    "new",
    "contacted",
    "qualified",
    "negotiating",
    "won",
    "lost",
    "archived",
  ],
} as const;
const buyerProperties = {
  buyerEmail: nullableEmail,
  buyerName: nullableName,
  buyerPhone: nullablePhone,
  email: nullableEmail,
  name: { type: "string", minLength: 1, maxLength: 191 },
  phone: nullablePhone,
} as const;

export const externalApiRequestSchemas = {
  CreateExternalApiClientRequest: {
    type: "object",
    additionalProperties: false,
    required: ["name", "scopes"],
    properties: {
      name: { type: "string", minLength: 2, maxLength: 120 },
      scopes: {
        type: "array",
        minItems: 1,
        maxItems: 40,
        items: { type: "string", enum: externalApiAssignableScopes },
      },
    },
  },
  CreateExternalApiLeadRequest: {
    type: "object",
    additionalProperties: false,
    properties: {
      ...buyerProperties,
      listingId: nullableIdentifier,
      message: nullableMessage,
      metadata: { type: "object", additionalProperties: true },
      source: {
        type: "string",
        default: "external_api",
        enum: [
          "public_site",
          "crm",
          "external_api",
          "manual",
          "olx",
          "whatsapp",
          "other",
        ],
      },
      title: nullableName,
      vehicleId: nullableIdentifier,
    },
    description:
      "At least one buyer name, phone, email, or message value is required.",
  },
  UpdateExternalApiLeadRequest: {
    type: "object",
    additionalProperties: false,
    properties: {
      ...buyerProperties,
      message: nullableMessage,
      metadata: { type: "object", additionalProperties: true },
      status: leadStatus,
    },
  },
} as const;

function nullableBoundedText(minLength: number, maxLength?: number) {
  return {
    anyOf: [
      {
        type: "string",
        minLength,
        ...(maxLength === undefined ? {} : { maxLength }),
      },
      { type: "null" },
    ],
  } as const;
}
