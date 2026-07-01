const slugSchema = {
  type: "string",
  minLength: 2,
  maxLength: 80,
  pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
} as const;

export const identityProvisioningSchemas = {
  AgencyStoreRequest: {
    type: "object",
    additionalProperties: false,
    required: ["publicSlug", "storeTradingName", "tenantId"],
    properties: storeRequestProperties({
      tenantId: { type: "string", format: "uuid" },
    }),
  },
  CreateAgencyRequest: {
    type: "object",
    additionalProperties: false,
    required: ["tenantSlug", "tenantTradingName"],
    properties: {
      firstUser: {
        type: "object",
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email", maxLength: 254 },
          name: { type: "string", minLength: 1, maxLength: 191 },
        },
      },
      tenantLegalName: { type: "string", minLength: 1, maxLength: 191 },
      tenantSlug: slugSchema,
      tenantTradingName: { type: "string", minLength: 2, maxLength: 191 },
    },
  },
  IdentityInvitation: {
    type: "object",
    additionalProperties: true,
    required: ["email", "id", "role", "status", "tenantId"],
    properties: {
      email: { type: "string", format: "email" },
      id: { type: "string", format: "uuid" },
      role: { type: "string" },
      status: { type: "string" },
      storeId: { type: ["string", "null"] },
      tenantId: { type: "string" },
    },
  },
  InviteStoreMemberRequest: {
    type: "object",
    additionalProperties: false,
    required: ["email", "role"],
    properties: {
      email: { type: "string", format: "email", maxLength: 254 },
      name: { type: "string", minLength: 1, maxLength: 191 },
      role: {
        type: "string",
        enum: ["investor", "owner", "salesman", "supervisor"],
      },
    },
  },
  OwnerStoreRequest: {
    type: "object",
    additionalProperties: false,
    required: ["publicSlug", "storeTradingName"],
    properties: storeRequestProperties({
      tenantLegalName: { type: "string", minLength: 1, maxLength: 191 },
      tenantTradingName: { type: "string", minLength: 1, maxLength: 191 },
    }),
  },
  ProvisionedAgency: {
    type: "object",
    additionalProperties: true,
    required: ["tenantId", "tenantName", "tenantSlug"],
    properties: {
      invitationId: { type: ["string", "null"], format: "uuid" },
      invitationStatus: { type: ["string", "null"] },
      tenantId: { type: "string" },
      tenantName: { type: "string" },
      tenantSlug: { type: "string" },
    },
  },
  ProvisionedStore: {
    type: "object",
    additionalProperties: true,
    required: ["role", "storeId", "storeName", "storeSlug", "tenantId"],
    properties: {
      role: { type: "string" },
      storeId: { type: "string" },
      storeName: { type: "string" },
      storeSlug: { type: "string" },
      tenantId: { type: "string" },
      tenantName: { type: "string" },
    },
  },
  SessionBootstrap: {
    type: "object",
    additionalProperties: true,
    required: ["needsOnboarding", "platformAdmin", "stores", "user"],
    properties: {
      defaultStore: { type: ["object", "null"], additionalProperties: true },
      needsOnboarding: { type: "boolean" },
      platformAdmin: { type: "boolean" },
      stores: { type: "array", items: { type: "object" } },
      tenantMemberships: { type: "array", items: { type: "object" } },
      user: { type: "object", additionalProperties: true },
    },
  },
} as const;

export const identityProvisioningPaths = {
  "/api/v1/admin/agencies": {
    post: provisioningPost(
      "Create agency tenant",
      "createAgencyTenant",
      "CreateAgencyRequest",
      "ProvisionedAgency",
      ["tenant.manage"],
    ),
  },
  "/api/v1/agency/stores": {
    post: provisioningPost(
      "Create agency-managed store",
      "createAgencyStore",
      "AgencyStoreRequest",
      "ProvisionedStore",
      ["store.manage"],
    ),
  },
  "/api/v1/identity/invitations": {
    post: provisioningPost(
      "Invite store member",
      "inviteStoreMember",
      "InviteStoreMemberRequest",
      "IdentityInvitation",
      ["users.manage"],
    ),
  },
  "/api/v1/identity/invitations/{invitationId}/resend": {
    post: {
      tags: ["Identity"],
      summary: "Resend identity invitation",
      operationId: "resendIdentityInvitation",
      security: [{ bearerAuth: ["users.manage"] }],
      parameters: [uuidPathParameter("invitationId")],
      responses: responseMap("IdentityInvitation"),
    },
  },
  "/api/v1/onboarding/owner-store": {
    post: provisioningPost(
      "Create first owner store",
      "createOwnerStore",
      "OwnerStoreRequest",
      "ProvisionedStore",
      ["identity.owner_store.create"],
    ),
  },
  "/api/v1/session/bootstrap": {
    get: {
      tags: ["Identity"],
      summary: "Bootstrap authenticated account session",
      operationId: "bootstrapAccountSession",
      security: [{ bearerAuth: ["identity.session.bootstrap"] }],
      responses: responseMap("SessionBootstrap"),
    },
  },
} as const;

function storeRequestProperties(extra: Record<string, unknown>) {
  return {
    profile: {
      type: "object",
      additionalProperties: false,
      properties: {
        contactEmail: { type: "string", format: "email", maxLength: 254 },
        contactPhone: { type: "string", minLength: 3, maxLength: 40 },
        documentNumber: { type: "string", minLength: 3, maxLength: 32 },
        whatsappPhone: { type: "string", minLength: 3, maxLength: 40 },
      },
    },
    publicSlug: slugSchema,
    storeLegalName: { type: "string", minLength: 1, maxLength: 191 },
    storeTradingName: { type: "string", minLength: 2, maxLength: 191 },
    ...extra,
  };
}

function provisioningPost(
  summary: string,
  operationId: string,
  requestSchema: string,
  responseSchema: string,
  permissions: readonly string[],
) {
  return {
    tags: ["Identity"],
    summary,
    operationId,
    security: [{ bearerAuth: [...permissions] }],
    requestBody: jsonRequest(requestSchema),
    responses: responseMap(responseSchema),
  };
}

function jsonRequest(schemaName: string) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

function responseMap(schemaName: string) {
  return {
    "200": jsonResponse(schemaName),
    "201": jsonResponse(schemaName),
    "400": { description: "Validation error with field-level issues." },
    "401": { description: "Missing or invalid Clerk session." },
    "403": { description: "Authenticated actor is not allowed." },
    "409": { description: "Conflict with existing tenant, store, or slug." },
    "503": {
      description: "Clerk provider or invitation delivery unavailable.",
    },
  };
}

function jsonResponse(schemaName: string) {
  return {
    description: "Successful response.",
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

function uuidPathParameter(name: string) {
  return {
    in: "path",
    name,
    required: true,
    schema: { type: "string", format: "uuid" },
  };
}
