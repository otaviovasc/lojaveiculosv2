import { describe, expect, it } from "vitest";
import { createApp } from "../../../infrastructure/http/createApp.js";
import { llmsText, openApiDocument } from "./docs.controller.js";

describe("API docs routes", () => {
  it("serves deterministic llms.txt metadata", async () => {
    const app = createApp();

    const response = await app.request("/llms.txt");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe(llmsText);
  });

  it("serves deterministic OpenAPI metadata", async () => {
    const app = createApp();

    const response = await app.request("/api/v1/openapi.json");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual(openApiDocument);
  });

  it("documents current inventory auth and planned external API limits", () => {
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}"].get
        .security,
    ).toEqual([{ bearerAuth: ["inventory.read"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings"].get.security,
    ).toEqual([{ bearerAuth: ["inventory.read"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/price"]
        .patch.security,
    ).toEqual([{ bearerAuth: ["inventory.update_price"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/status"]
        .patch.security,
    ).toEqual([{ bearerAuth: ["inventory.update_status"] }]);
    expect(
      openApiDocument.paths[
        "/api/v1/inventory/listings/{listingId}/media/uploads"
      ].post.security,
    ).toEqual([{ bearerAuth: ["inventory.create"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/costs"].post
        .security,
    ).toEqual([{ bearerAuth: ["inventory.cost_create"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/reserve"]
        .post.security,
    ).toEqual([{ bearerAuth: ["inventory.reserve"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/sell"].post
        .security,
    ).toEqual([{ bearerAuth: ["inventory.sell"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/reserve"]
        .post.requestBody.content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/ReserveVehicleListingRequest" });
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/sell"].post
        .requestBody.content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/SellVehicleListingRequest" });
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/costs"].post
        .requestBody.content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/CreateVehicleCostRequest" });
    expect(
      openApiDocument.paths[
        "/api/v1/inventory/listings/{listingId}/units/{unitId}/checklists"
      ].post.requestBody.content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/CreateVehicleChecklistRequest" });
    expect(openApiDocument.components.schemas.VehicleMediaUpload).toEqual(
      expect.objectContaining({
        required: [
          "expiresAt",
          "publicUrl",
          "storageKey",
          "uploadHeaders",
          "uploadMethod",
          "uploadUrl",
        ],
      }),
    );
    expect(openApiDocument.components.schemas.InventoryListingDetail).toEqual(
      expect.objectContaining({
        required: [
          "checklists",
          "documents",
          "listing",
          "media",
          "status",
          "units",
        ],
      }),
    );
    expect(
      openApiDocument.components.schemas.VehicleChecklistStatus.enum,
    ).toEqual(["failed", "in_progress", "passed", "pending", "waived"]);
    expect(openApiDocument.components.schemas.VehicleDocumentKind.enum).toEqual(
      expect.arrayContaining([
        "reservation_receipt",
        "sale_contract",
        "sale_receipt",
        "delivery_term",
        "power_of_attorney",
      ]),
    );
    expect(openApiDocument["x-scopes"]["inventory.read"]).toContain(
      "Read vehicle inventory",
    );
    expect(openApiDocument["x-finance-side-effects"].linkTargets).toEqual(
      expect.arrayContaining(["sale", "sale_payment", "vehicle_cost"]),
    );
    expect(openApiDocument["x-planned-external-api-safety-limits"]).toContain(
      "Tenant and store scoping required for every external request.",
    );
  });
});
