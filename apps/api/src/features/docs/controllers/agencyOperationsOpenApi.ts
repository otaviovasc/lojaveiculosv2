import { agencyOperationsSchemas } from "./agencyOperationsOpenApiSchemas.js";

const tenantIdParameter = uuidPathParameter("tenantId");
const storeIdParameter = uuidPathParameter("storeId");

export { agencyOperationsSchemas };

export const agencyOperationsPaths = {
  "/api/v1/agency/tenants/{tenantId}/stats": {
    get: {
      tags: ["Agency", "Analytics"],
      summary: "Read agency network or store statistics",
      description:
        "Returns tenant-scoped dealership statistics for the requested date range. Omit from and to together to use the trailing 30-day period; provide both for an explicit range.",
      operationId: "getAgencyStats",
      security: [{ bearerAuth: ["analytics.read"] }],
      parameters: [
        tenantIdParameter,
        optionalQueryParameter("from", { type: "string", format: "date" }),
        optionalQueryParameter("to", { type: "string", format: "date" }),
        optionalQueryParameter("storeId", {
          type: "string",
          format: "uuid",
        }),
      ],
      responses: {
        "200": jsonResponse(
          "AgencyStatsReport",
          "Tenant-scoped agency statistics.",
        ),
        "400": { description: "Tenant, store, or date range is invalid." },
        "401": { description: "Authentication is required." },
        "403": { description: "analytics.read permission is required." },
        "404": {
          description: "The selected store does not belong to the tenant.",
        },
      },
    },
  },
  "/api/v1/agency/tenants/{tenantId}/team-access": {
    get: {
      tags: ["Agency", "Identity"],
      summary: "List stores available for agency team administration",
      operationId: "listAgencyTeamAccessStores",
      security: [{ bearerAuth: ["users.manage"] }],
      parameters: [tenantIdParameter],
      responses: {
        "200": jsonResponse(
          "AgencyTeamAccessDirectory",
          "Agency-managed store directory.",
        ),
        ...teamAccessErrors(),
      },
    },
  },
  "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/team-access": {
    get: {
      tags: ["Agency", "Identity"],
      summary: "Read one managed store team-access matrix",
      operationId: "getAgencyStoreTeamAccess",
      security: [{ bearerAuth: ["users.manage"] }],
      parameters: [tenantIdParameter, storeIdParameter],
      responses: {
        "200": jsonResponse(
          "RoleManagementView",
          "Selected store role and membership matrix.",
        ),
        ...teamAccessErrors(),
      },
    },
  },
  "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/team-access/memberships/{membershipId}":
    {
      patch: {
        tags: ["Agency", "Identity"],
        summary: "Update one managed store membership",
        operationId: "updateAgencyStoreTeamAccessMembership",
        security: [{ bearerAuth: ["users.manage"] }],
        parameters: [
          tenantIdParameter,
          storeIdParameter,
          uuidPathParameter("membershipId"),
        ],
        requestBody: jsonRequest("AgencyTeamAccessUpdateRequest"),
        responses: {
          "200": jsonResponse(
            "RoleManagementView",
            "Updated store role and membership matrix.",
          ),
          ...teamAccessErrors(),
        },
      },
    },
  "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/team-access/invitations":
    {
      post: {
        tags: ["Agency", "Identity"],
        summary: "Invite a member to one managed store",
        operationId: "inviteAgencyStoreMember",
        security: [{ bearerAuth: ["users.manage"] }],
        parameters: [tenantIdParameter, storeIdParameter],
        requestBody: jsonRequest("InviteStoreMemberRequest"),
        responses: {
          "201": jsonResponse(
            "IdentityInvitation",
            "Invitation request accepted by the identity provider.",
          ),
          ...teamAccessErrors(),
          "402": { description: "A billing contract is required." },
          "409": {
            description:
              "Invitation or user quota conflicts with current state.",
          },
          "503": { description: "Invitation provider is unavailable." },
        },
      },
    },
  "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/team-access/invitations/{invitationId}/resend":
    {
      post: {
        tags: ["Agency", "Identity"],
        summary: "Resend one managed store invitation",
        operationId: "resendAgencyStoreInvitation",
        security: [{ bearerAuth: ["users.manage"] }],
        parameters: [
          tenantIdParameter,
          storeIdParameter,
          uuidPathParameter("invitationId"),
        ],
        responses: {
          "200": jsonResponse(
            "IdentityInvitation",
            "Invitation resend request accepted by the identity provider.",
          ),
          ...teamAccessErrors(),
          "409": { description: "Invitation state conflicts with resend." },
          "503": { description: "Invitation provider is unavailable." },
        },
      },
    },
} as const;

function optionalQueryParameter(name: string, schema: Record<string, unknown>) {
  return { in: "query", name, required: false, schema } as const;
}

function uuidPathParameter(name: string) {
  return {
    in: "path",
    name,
    required: true,
    schema: { type: "string", format: "uuid" },
  } as const;
}

function jsonRequest(schemaName: string) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  } as const;
}

function jsonResponse(schemaName: string, description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  } as const;
}

function teamAccessErrors() {
  return {
    "400": { description: "Route parameters or request body are invalid." },
    "401": { description: "Authentication is required." },
    "403": { description: "users.manage permission is required." },
    "404": { description: "Managed store or membership was not found." },
  } as const;
}
