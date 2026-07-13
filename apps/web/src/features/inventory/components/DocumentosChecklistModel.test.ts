import { describe, expect, it } from "vitest";
import { checklistStatus } from "./DocumentosChecklistModel";

describe("document checklist status", () => {
  it("keeps an empty checklist pending", () => {
    expect(checklistStatus([])).toBe("pending");
  });

  it("treats an omitted item status as pending", () => {
    expect(checklistStatus([{ label: "Documento" }])).toBe("pending");
  });

  it("marks a mixed completed checklist as in progress", () => {
    expect(
      checklistStatus([
        { label: "Documento", status: "passed" },
        { label: "Chave", status: "pending" },
      ]),
    ).toBe("in_progress");
  });
});
