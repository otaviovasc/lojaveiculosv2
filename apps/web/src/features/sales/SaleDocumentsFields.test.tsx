// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SaleRecord } from "./types";
import type { RequiredFieldsPolicy } from "./validation";
import { VehicleDocumentationFields } from "./SaleDocumentsFields";

afterEach(cleanup);

describe("VehicleDocumentationFields", () => {
  it("normalizes Renavam and VIN before updating sale documents", () => {
    const onChange = vi.fn();
    render(
      <VehicleDocumentationFields
        emitirNFe={false}
        errors={{}}
        listing={{} as SaleRecord["listingSnapshot"]}
        onChange={onChange}
        policy={{} as RequiredFieldsPolicy}
      />,
    );

    const renavam = screen.getByLabelText(/^Renavam/);
    fireEvent.change(renavam, { target: { value: "001.234.567-89 extra" } });
    fireEvent.blur(renavam);
    expect(onChange).toHaveBeenLastCalledWith("renavam", "00123456789");

    const vin = screen.getByLabelText(/Chassi/);
    fireEvent.change(vin, { target: { value: "9bw zzZ-377-vt004251" } });
    fireEvent.blur(vin);
    expect(onChange).toHaveBeenLastCalledWith("chassi", "9BWZZZ377VT004251");
  });
});
