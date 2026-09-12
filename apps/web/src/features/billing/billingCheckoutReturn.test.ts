// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { readBillingCheckoutReturn } from "./billingCheckoutReturn";

describe("billing checkout browser return", () => {
  afterEach(() => window.history.replaceState({}, "", "/"));

  it("treats browser success only as an unverified return hint", () => {
    window.history.replaceState({}, "", "/billing?checkout=success");

    expect(readBillingCheckoutReturn("store")).toMatchObject({
      title: "Retorno do checkout recebido",
      tone: "info",
    });
    expect(readBillingCheckoutReturn("store")?.message).toMatch(
      /só será ativado quando o servidor confirmar/i,
    );
  });

  it.each([
    ["cancelled", "Checkout cancelado"],
    ["expired", "Checkout expirado"],
  ])("maps %s without implying payment success", (status, title) => {
    window.history.replaceState({}, "", `/billing?checkout=${status}`);
    expect(readBillingCheckoutReturn("store")).toMatchObject({
      title,
      tone: "warning",
    });
  });

  it("ignores unknown callback states", () => {
    window.history.replaceState({}, "", "/billing?checkout=paid");
    expect(readBillingCheckoutReturn("store")).toBeNull();
  });
});
