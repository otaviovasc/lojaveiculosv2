// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AutoEntryTeamRosterCard } from "./AutoEntryTeamRosterCard";

afterEach(cleanup);

describe("AutoEntryTeamRosterCard", () => {
  it("translates seller roles before displaying them", () => {
    render(
      <AutoEntryTeamRosterCard
        rules={[]}
        sellers={[
          {
            detail: "Proprietário · owner@example.com",
            id: "owner_1",
            label: "Maria",
            role: "owner",
          },
        ]}
      />,
    );

    expect(screen.getByText("Proprietário")).toBeVisible();
    expect(screen.queryByText("owner")).not.toBeInTheDocument();
  });
});
