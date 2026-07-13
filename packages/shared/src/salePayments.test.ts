import { describe, expect, it } from "vitest";
import {
  isActiveSalePaymentStatus,
  isSalePaymentMethod,
  salePaymentMethods,
} from "./salePayments.js";

describe("sale payment contract", () => {
  it.each(salePaymentMethods)("accepts the supported %s method", (method) => {
    expect(isSalePaymentMethod(method)).toBe(true);
  });

  it("rejects methods outside the shared contract", () => {
    expect(isSalePaymentMethod("bank_transfer")).toBe(false);
    expect(isSalePaymentMethod("card")).toBe(false);
  });

  it("keeps only pending and paid allocations active", () => {
    expect(isActiveSalePaymentStatus("pending")).toBe(true);
    expect(isActiveSalePaymentStatus("paid")).toBe(true);
    expect(isActiveSalePaymentStatus("cancelled")).toBe(false);
    expect(isActiveSalePaymentStatus("refunded")).toBe(false);
  });
});
