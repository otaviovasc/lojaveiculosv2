import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DetailsStep } from "./FinanceEntryModalSteps";
import { createEntryDraft } from "./financeBillsModel";

describe("FinanceEntryModalSteps", () => {
  it("does not show receipt upload fields for recurring rules", () => {
    const html = renderToStaticMarkup(
      <DetailsStep
        draft={{ ...createEntryDraft("expense"), recurrence: "recurring" }}
        setDraft={() => undefined}
        setField={() => () => undefined}
      />,
    );

    expect(html).not.toContain("Comprovante opcional");
    expect(html).toContain("Frequência");
    expect(html).not.toContain("Veículo");
  });

  it("offers inventory units for one-time expense association", () => {
    const html = renderToStaticMarkup(
      <DetailsStep
        draft={{
          ...createEntryDraft("expense"),
          recurrence: "once",
          vehicleUnitId: "unit_42",
        }}
        setDraft={() => undefined}
        setField={() => () => undefined}
        vehicleOptions={[
          {
            detail: "EST-42 · ABC1D23 · Disponível",
            id: "unit_42",
            label: "Corolla XEi 2024 · EST-42",
            listingId: "listing_42",
          },
        ]}
        vehicleOptionsState={{ kind: "ready" }}
      />,
    );

    expect(html).toContain("Veículo");
    expect(html).toContain("Corolla XEi 2024");
  });
});
