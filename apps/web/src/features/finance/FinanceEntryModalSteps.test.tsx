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
  });
});
