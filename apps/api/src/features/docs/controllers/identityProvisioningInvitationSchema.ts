export const identityProvisioningInvitationSchema = {
  type: "object",
  additionalProperties: true,
  required: [
    "acceptUrl",
    "email",
    "emailDeliveryStatus",
    "id",
    "role",
    "status",
    "tenantId",
  ],
  properties: {
    acceptUrl: {
      type: ["string", "null"],
      format: "uri",
      description:
        "Sensitive Clerk acceptance URL returned only by create/resend operations.",
    },
    email: { type: "string", format: "email" },
    emailDeliveryStatus: {
      type: "string",
      enum: ["failed", "requested"],
      description:
        "Requested means Clerk accepted the send request; it does not prove mailbox delivery.",
    },
    id: { type: "string", format: "uuid" },
    role: { type: "string" },
    status: { type: "string" },
    storeId: { type: ["string", "null"] },
    tenantId: { type: "string" },
  },
} as const;
