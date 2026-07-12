// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocumentsTableSkeleton } from "./DocumentsModuleParts";

describe("DocumentsTableSkeleton", () => {
  it("announces the loading state with valid status semantics", () => {
    render(<DocumentsTableSkeleton />);

    expect(
      screen.getByRole("status", { name: "Carregando documentos" }),
    ).toBeInTheDocument();
  });
});
