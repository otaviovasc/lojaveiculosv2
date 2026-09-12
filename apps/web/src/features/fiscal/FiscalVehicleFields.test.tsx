// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IssueFiscalTaxForm } from "./fiscalIssueModel";
import type { VehicleNfeVehicle } from "./types";
import { FiscalVehicleFields } from "./FiscalVehicleFields";

afterEach(cleanup);

describe("FiscalVehicleFields", () => {
  it("normalizes vehicle identifiers and odometer before issue", () => {
    const onVehicleChange = vi.fn();
    render(
      <FiscalVehicleFields
        fiscal={{} as IssueFiscalTaxForm}
        onFiscalChange={vi.fn()}
        onVehicleChange={onVehicleChange}
        vehicle={{} as VehicleNfeVehicle}
      />,
    );

    fireEvent.change(screen.getByLabelText("Placa"), {
      target: { value: "abc-1d23 extra" },
    });
    expect(onVehicleChange).toHaveBeenLastCalledWith({ plate: "ABC1D23" });

    fireEvent.change(screen.getByLabelText("Chassi"), {
      target: { value: "9bw zzZ-377-vt004251" },
    });
    expect(onVehicleChange).toHaveBeenLastCalledWith({
      chassis: "9BWZZZ377VT004251",
    });

    fireEvent.change(screen.getByLabelText("Renavam"), {
      target: { value: "001.234.567-89 extra" },
    });
    expect(onVehicleChange).toHaveBeenLastCalledWith({
      renavam: "00123456789",
    });

    fireEvent.change(screen.getByLabelText("Hodômetro"), {
      target: { value: "32.500 km" },
    });
    expect(onVehicleChange).toHaveBeenLastCalledWith({ odometer: "32500" });
  });
});
