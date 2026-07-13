// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DocumentosRenaveCard } from "./DocumentosRenaveCard";

describe("DocumentosRenaveCard", () => {
  afterEach(cleanup);

  it("does not imply that a RENAVE operation happened without an integration", () => {
    render(<DocumentosRenaveCard />);

    expect(screen.getByText("Não integrado")).toBeVisible();
    expect(
      screen.getByText("Nenhuma operação foi enviada ao RENAVE"),
    ).toBeVisible();
    expect(screen.queryByText("Entrada Concluída")).not.toBeInTheDocument();
    expect(screen.queryByText("REV-82947118")).not.toBeInTheDocument();
  });
});
