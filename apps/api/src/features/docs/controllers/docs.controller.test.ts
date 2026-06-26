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
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/media/uploads"]
        .post.security,
    ).toEqual([{ bearerAuth: ["inventory.create"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/costs"].post
        .security,
    ).toEqual([{ bearerAuth: ["inventory.cost_create"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/suppliers"].post.security,
    ).toEqual([{ bearerAuth: ["inventory.update_unit"] }]);
    expect(
      openApiDocument.paths[
        "/api/v1/inventory/listings/{listingId}/units/{unitId}/acquisition"
      ].put.requestBody.content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/UpsertVehicleUnitAcquisitionRequest",
    });
    expect(
      openApiDocument.paths["/api/v1/finance/entries"].post.security,
    ).toEqual([{ bearerAuth: ["finance.create"] }]);
    expect(
      openApiDocument.paths["/api/v1/finance/entries/{entryId}"].get.security,
    ).toEqual([{ bearerAuth: ["finance.read"] }]);
    expect(
      openApiDocument.paths[
        "/api/v1/finance/entries/{entryId}/documents/uploads"
      ].post.security,
    ).toEqual([{ bearerAuth: ["finance.attach_document"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/reserve"].post
        .security,
    ).toEqual([{ bearerAuth: ["inventory.reserve"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/sell"].post
        .security,
    ).toEqual([{ bearerAuth: ["inventory.sell"] }]);
    expect(
      openApiDocument.paths[
        "/api/v1/inventory/units/{unitId}/reservation/release"
      ].post.security,
    ).toEqual([{ bearerAuth: ["inventory.reserve"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/reserve"].post
        .requestBody.content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/ReserveVehicleListingRequest" });
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/sell"].post
        .requestBody.content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/SellVehicleListingRequest" });
    const paths = openApiDocument.paths as Record<string, unknown>;
    expect(
      paths["/api/v1/inventory/listings/{listingId}/reserve"],
    ).toBeUndefined();
    expect(
      paths["/api/v1/inventory/listings/{listingId}/sell"],
    ).toBeUndefined();
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
    expect(
      openApiDocument.components.schemas.CreateFinanceEntryRequest.properties
        .documentUpload,
    ).toEqual({
      $ref: "#/components/schemas/CreateFinanceEntryDocumentUploadRequest",
    });
    expect(
      openApiDocument.components.schemas.FinanceEntryDetail.required,
    ).toEqual(["entry", "links", "documents"]);
    expect(openApiDocument["x-scopes"]["inventory.read"]).toContain(
      "Read vehicle inventory",
    );
    expect(openApiDocument["x-scopes"]["finance.attach_document"]).toContain(
      "attach documents",
    );
    expect(openApiDocument["x-finance-side-effects"].linkTargets).toEqual(
      expect.arrayContaining(["sale", "sale_payment", "vehicle_cost"]),
    );
    expect(openApiDocument["x-planned-external-api-safety-limits"]).toContain(
      "Tenant and store scoping required for every external request.",
    );
  });
});
