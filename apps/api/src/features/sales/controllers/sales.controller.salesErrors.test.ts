import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { SaleUnitConflictError } from "../../../domains/sales/saleUnitConflict.js";
import { mapSalesDomainError } from "./sales.controller.salesErrors.js";

describe("sales domain HTTP errors", () => {
  it("maps an active sale unit conflict to a stable 409", async () => {
    const app = new Hono();
    app.get("/", (context) => {
      const response = mapSalesDomainError(
        context,
        new SaleUnitConflictError(),
      );
      if (!response) throw new Error("Expected mapped sales error.");
      return response;
    });

    const response = await app.request("/");

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "SALE_UNIT_CONFLICT",
      message: "Vehicle unit already has a current sale.",
    });
  });
});
