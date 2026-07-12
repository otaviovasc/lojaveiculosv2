import { describe, expect, it } from "vitest";
import { findApiErrorEnvelopeViolations } from "./api-error-envelope-rules.mjs";

describe("API error envelope rules", () => {
  it("finds message and error fields regardless of object key order", () => {
    const source = [
      "context.json({ code: 'BAD_INPUT', message }, 400);",
      "context.json({ requestId, ['error']: reason }, 500);",
    ].join("\n");

    const violations = find(source);
    expect(violations).toHaveLength(2);
    expect(violations.map((item) => item.line)).toEqual([1, 2]);
  });

  it("reports Response.json only once", () => {
    const violations = find(
      "return Response.json(({ requestId, message: 'Nope' } as const));",
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("Response.json(...)");
  });

  it("finds direct context.error assignments", () => {
    const violations = find("context['error'] = cause;");

    expect(violations).toEqual([
      expect.objectContaining({ kind: "context-error-assignment", line: 1 }),
    ]);
  });

  it("ignores examples in comments and string literals", () => {
    const source = [
      "// context.json({ message: 'example' }, 400);",
      "const docs = `context.error = reason`;",
      "return context.json({ data, code: 'OK' }, 200);",
    ].join("\n");

    expect(find(source)).toEqual([]);
  });
});

function find(source) {
  return findApiErrorEnvelopeViolations("controller.ts", source);
}
