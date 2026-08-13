import { describe, expect, it } from "vitest";
import { mapStores } from "./credereDtoMappers.js";

describe("Credere store mapper", () => {
  it("uses the provider active flag when status is omitted", () => {
    expect(
      mapStores({
        stores: [
          {
            active: true,
            cnpj: "00.000.000/0001-00",
            display_name: "Credere Matriz",
            id: "store_active",
            name: "Matriz",
          },
          {
            active: false,
            id: "store_inactive",
            name: "Filial",
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({ id: "store_active", status: "active" }),
      expect.objectContaining({ id: "store_inactive", status: "inactive" }),
    ]);
  });
});
