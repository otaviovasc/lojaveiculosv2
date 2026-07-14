export const identityPaths = {
  "/api/v1/identity/member-options": {
    get: {
      tags: ["Identity"],
      summary: "List active store members for workflow selectors",
      description:
        "Returns only the identity fields required by seller and responsible-member selectors. It does not expose the role-management matrix or permission overrides.",
      operationId: "listStoreMemberOptions",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Active store member options.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StoreMemberOptionsView" },
            },
          },
        },
        "403": { description: "Missing a supported workflow permission." },
      },
    },
  },
  "/api/v1/identity/roles": {
    get: {
      tags: ["Identity"],
      summary: "List role and permission management matrix",
      description:
        "Returns role templates, domain-grouped permissions, assignability metadata, and store memberships with base/effective permissions.",
      operationId: "listRoleManagement",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Role management matrix.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoleManagementView" },
            },
          },
        },
        "403": { description: "Missing users.manage permission." },
      },
    },
  },
  "/api/v1/identity/memberships/{membershipId}/access": {
    patch: {
      tags: ["Identity"],
      summary: "Update one member role and permission overrides",
      description:
        "Updates a subuser role and exact permission overrides. Agency actors can manage store owners, supervisors, salespeople, and investors; owner actors can manage supervisors, salespeople, and investors.",
      operationId: "updateMembershipAccess",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "membershipId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "Updated role management matrix.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoleManagementView" },
            },
          },
        },
        "400": { description: "Policy or validation error." },
        "403": { description: "Missing permission." },
        "404": { description: "Membership not found." },
      },
    },
  },
} as const;

export const identitySchemas = {
  StoreMemberOptionsView: {
    type: "object",
    additionalProperties: false,
    required: ["members"],
    properties: {
      members: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["email", "name", "role", "userId"],
          properties: {
            email: { type: "string" },
            name: { type: ["string", "null"] },
            role: { type: "string" },
            userId: { type: "string" },
          },
        },
      },
    },
  },
  RoleManagementView: {
    type: "object",
    additionalProperties: true,
    required: [
      "actor",
      "memberships",
      "pendingInvitations",
      "permissionGroups",
      "roles",
    ],
    properties: {
      actor: { type: "object", additionalProperties: true },
      memberships: { type: "array", items: { type: "object" } },
      pendingInvitations: { type: "array", items: { type: "object" } },
      permissionGroups: { type: "array", items: { type: "object" } },
      roles: { type: "array", items: { type: "object" } },
    },
  },
} as const;
