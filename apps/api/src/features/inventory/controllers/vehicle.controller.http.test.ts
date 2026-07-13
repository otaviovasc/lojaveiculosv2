import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { SaleUnitConflictError } from "../../../domains/sales/saleUnitConflict.js";
import { handle } from "./vehicle.controller.http.js";

describe("inventory HTTP errors", () => {
  it("maps a direct workflow active-sale conflict to a stable 409", async () => {
    const app = new Hono();
    app.get("/", (context) =>
      handle(context, async () => {
        throw new SaleUnitConflictError();
      }),
    );

    const response = await app.request("/");

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "SALE_UNIT_CONFLICT",
      message: "Vehicle unit already has a current sale.",
    });
  });
});
