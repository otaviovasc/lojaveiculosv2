import { Children, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  DocumentPdfClause,
  DocumentPdfClauses,
} from "./reactPdfDocumentPrimitives.js";

describe("react PDF document primitives", () => {
  it("keeps the clause heading and body together across page breaks", () => {
    const section = DocumentPdfClauses({
      clauses: ["Primeira condição", "Segunda condição"],
    });
    const [opening, secondClause] = elementChildren(section);

    expect(opening?.props.wrap).toBe(false);
    expect(secondClause?.props.index).toBe(1);
    const renderedClause = DocumentPdfClause({
      clause: String(secondClause?.props.clause),
      index: Number(secondClause?.props.index),
    });
    expect(renderedClause.props.wrap).toBe(false);
  });
});

function elementChildren(element: ReactElement) {
  return Children.toArray(
    (element.props as { children?: ReactNode }).children,
  ) as ReactElement<Record<string, unknown>>[];
}
