import { describe, expect, it } from "vitest";
import { readCrmFailedSendStatus } from "./crmSendOutcome";

describe("CRM send outcome", () => {
  it.each([
    new TypeError("fetch failed"),
    Object.assign(new Error("provider timeout"), { status: 504 }),
    Object.assign(new Error("rate limited"), { status: 429 }),
    Object.assign(new Error("unknown"), {
      code: "CRM_MESSAGING_PROVIDER_ERROR",
      status: 502,
    }),
  ])("treats transport/provider uncertainty as indeterminate", (error) => {
    expect(readCrmFailedSendStatus(error)).toBe("INDETERMINATE");
  });

  it.each([400, 401, 403, 404, 409, 422])(
    "allows retry for a deterministic HTTP %s rejection",
    (status) => {
      expect(
        readCrmFailedSendStatus(
          Object.assign(new Error("rejected"), { status }),
        ),
      ).toBe("FAILED");
    },
  );

  it("honors explicit indeterminate outcome codes", () => {
    expect(
      readCrmFailedSendStatus({ code: "PROVIDER_RESULT_INDETERMINATE" }),
    ).toBe("INDETERMINATE");
  });
});
