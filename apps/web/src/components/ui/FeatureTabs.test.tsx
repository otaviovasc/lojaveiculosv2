// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CalendarClock, CarFront, Radio } from "lucide-react";
import { FeatureTabs } from "./FeatureTabs";

function FeatureTabsHarness() {
  const [value, setValue] = useState("schedules");

  return (
    <FeatureTabs
      ariaLabel="CRM areas"
      onChange={setValue}
      options={[
        { icon: CalendarClock, label: "Agendar", value: "schedules" },
        { icon: CarFront, label: "Visitas", value: "visits" },
        { icon: Radio, label: "Conexão", value: "connection" },
      ]}
      value={value}
    />
  );
}

describe("FeatureTabs", () => {
  afterEach(cleanup);

  it("keeps tab icons as single layers when the active tab changes", async () => {
    const user = userEvent.setup();
    render(<FeatureTabsHarness />);

    await user.click(screen.getByRole("tab", { name: "Visitas" }));

    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.querySelectorAll("svg")).toHaveLength(1);
      expect(tab.querySelector(".animated-icon-swap-container")).toBeNull();
      expect(tab.querySelector(".animated-icon-layer")).toBeNull();
    }
  });
});
