export const credereRequiredFieldsResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "applicant",
    "domains",
    "knownLead",
    "missingFields",
    "requirements",
  ],
  properties: {
    applicant: {
      type: ["object", "null"],
      additionalProperties: false,
      required: [
        "addressZipCode",
        "birthDate",
        "email",
        "genderCode",
        "hasCnh",
        "monthlyIncomeCents",
        "name",
        "occupationCode",
        "phone",
      ],
      properties: {
        addressZipCode: { type: ["string", "null"] },
        birthDate: { type: ["string", "null"] },
        email: { type: ["string", "null"] },
        genderCode: { type: ["string", "null"] },
        hasCnh: { type: ["boolean", "null"] },
        monthlyIncomeCents: { type: ["integer", "null"] },
        name: { type: ["string", "null"] },
        occupationCode: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
      },
    },
    domains: stringArrayMap({
      type: "object",
      additionalProperties: false,
      required: ["label", "value"],
      properties: {
        label: { type: "string" },
        value: { type: "string" },
      },
    }),
    knownLead: { type: "boolean" },
    missingFields: { type: "array", items: { type: "string" } },
    requirements: stringArrayMap({ type: "string" }),
  },
} as const;

function stringArrayMap(items: Record<string, unknown>) {
  return {
    type: "object",
    additionalProperties: { type: "array", items },
  } as const;
}
