import { describe, expect, it } from "vitest";
import {
  agencyOperationsPaths,
  agencyOperationsSchemas,
} from "./agencyOperationsOpenApi.js";

describe("agency operations OpenAPI", () => {
  it("publishes tenant and optional store-scoped statistics", () => {
    const operation =
      agencyOperationsPaths["/api/v1/agency/tenants/{tenantId}/stats"].get;

    expect(operation.security).toEqual([{ bearerAuth: ["analytics.read"] }]);
    expect(operation.parameters.map((parameter) => parameter.name)).toEqual([
      "tenantId",
      "from",
      "to",
      "storeId",
    ]);
    expect(
      operation.responses["200"].content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/AgencyStatsReport" });
    expect(agencyOperationsSchemas.AgencyStatsReport.required).toContain(
      "totals",
    );
  });

  it("publishes every agency team-access operation", () => {
    const directory =
      agencyOperationsPaths["/api/v1/agency/tenants/{tenantId}/team-access"]
        .get;
    const roster =
      agencyOperationsPaths[
        "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/team-access"
      ].get;
    const membership =
      agencyOperationsPaths[
        "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/team-access/memberships/{membershipId}"
      ].patch;
    const invitation =
      agencyOperationsPaths[
        "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/team-access/invitations"
      ].post;
    const resend =
      agencyOperationsPaths[
        "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/team-access/invitations/{invitationId}/resend"
      ].post;

    expect([
      directory.security,
      roster.security,
      membership.security,
      invitation.security,
      resend.security,
    ]).toEqual(
      Array.from({ length: 5 }, () => [{ bearerAuth: ["users.manage"] }]),
    );
    expect(membership.requestBody).toMatchObject({
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/AgencyTeamAccessUpdateRequest",
          },
        },
      },
    });
    expect(
      invitation.responses["201"].content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/IdentityInvitation" });
    expect(resend.responses["200"].content["application/json"].schema).toEqual({
      $ref: "#/components/schemas/IdentityInvitation",
    });
  });
});
