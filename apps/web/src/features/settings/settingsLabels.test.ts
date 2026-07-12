import { describe, expect, it } from "vitest";
import { getDomainStatusLabel, getRoleLabel } from "./settingsLabels";

describe("settingsLabels", () => {
  it("provides stable user-facing role names", () => {
    expect(getRoleLabel("salesman")).toBe("Vendedor");
    expect(getRoleLabel("agency")).toBe("Gestor da agência");
  });

  it("does not expose unknown domain status enums", () => {
    expect(getDomainStatusLabel("not_configured")).toBe("Não configurado");
    expect(getDomainStatusLabel("provider_internal_state")).toBe(
      "Status indisponível",
    );
  });
});
